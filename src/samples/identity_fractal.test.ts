/**
 * identity_fractal.test.ts
 *
 * Headline test for the Fractal + Interface model (the book's "Building Platforms
 * that Scale" abstractions, expressed in the SDK's functional idiom).
 *
 * The contract being proven:
 *   - An infra team authors a Fractal: a Blueprint of abstract components, each
 *     carrying the set of candidate Offers that can satisfy it, plus a typed
 *     Interface of declarative operations.
 *   - A dev team specializes the Fractal ONLY through the Interface. The dev code
 *     never names a vendor Offer.
 *   - The concrete Offer is selected by PROVIDER at LiveSystem time. Swapping the
 *     provider (AWS -> CaaS) changes which Offer is instantiated, but leaves the
 *     dev's interface-level specialization — and the neutral parameters it sets —
 *     byte-for-byte identical.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {IdentityProvider} from '../fractal/component/security/identity_provider';
import {Cognito} from '../live_system/component/security/paas/cognito';
import {Keycloak} from '../live_system/component/security/caas/keycloak';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';

// ── fixtures ─────────────────────────────────────────────────────────────────

const kebab = (v: string) => KebabCaseString.getBuilder().withValue(v).build();
const ownerId = OwnerId.getBuilder()
  .withValue('00000000-0000-0000-0000-000000000001')
  .build();
const boundedContextId = getBoundedContextIdBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(ownerId)
  .withName(kebab('reusable-templates'))
  .build();
const environment = getEnvironmentBuilder()
  .withId(
    getEnvironmentIdBuilder()
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(ownerId)
      .withName(kebab('test'))
      .build(),
  )
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
// The IdentityProvider abstract component declares the candidate offers
// (Cognito on AWS, Keycloak on CaaS). The interface exposes vendor-neutral ops.
function authorIdentityFractal() {
  return createFractal({
    id: 'identity',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed identity provider',
    boundedContextId,
    blueprint: bp => ({
      idp: bp.add(
        IdentityProvider.create({
          id: 'idp',
          displayName: 'User Identity Provider',
          offers: [Cognito, Keycloak],
        }),
      ),
    }),
    operations: bp => ({
      withUserDirectory: (name: string) =>
        bp.idp.set('userDirectoryName', name),
      withPasswordPolicy: (policy: {minLength: number}) =>
        bp.idp.set('passwordPolicy', policy),
      withMfa: (mode: 'OFF' | 'OPTIONAL' | 'ON') =>
        bp.idp.set('mfaConfiguration', mode),
      addAppClient: (client: {name: string; callbackUrls: string[]}) =>
        bp.idp.set('appClient', client),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specializeAndInstantiate(provider: 'AWS' | 'CaaS') {
  const fractal = authorIdentityFractal();

  fractal.operations
    .withUserDirectory('acme-users')
    .withPasswordPolicy({minLength: 12})
    .withMfa('OPTIONAL')
    .addAppClient({
      name: 'acme-web',
      callbackUrls: ['https://app.acme.com/callback'],
    });

  // The provider — NOT the dev's specialization code — selects the offer.
  return fractal.toLiveSystem({name: 'acme-prod', environment, provider});
}

describe('IdentityFractal — provider-driven offer swap', () => {
  const NEUTRAL_KEYS = [
    'userDirectoryName',
    'passwordPolicy',
    'mfaConfiguration',
    'appClient',
  ];

  it('selects Cognito on AWS and Keycloak on CaaS from the same authored Fractal', () => {
    const aws = specializeAndInstantiate('AWS');
    const caas = specializeAndInstantiate('CaaS');

    const awsIdp = aws.components.find(c => c.id.toString() === 'idp')!;
    const caasIdp = caas.components.find(c => c.id.toString() === 'idp')!;

    expect(awsIdp).toBeDefined();
    expect(caasIdp).toBeDefined();

    // The offer identity is the ONLY thing that differs.
    expect(awsIdp.type.toString()).toBe('Security.PaaS.Cognito');
    expect(awsIdp.provider).toBe('AWS');
    expect(caasIdp.type.toString()).toBe('Security.CaaS.Keycloak');
    expect(caasIdp.provider).toBe('CaaS');
  });

  it('flows identical neutral parameters to whichever offer the provider selects', () => {
    const awsIdp = specializeAndInstantiate('AWS').components.find(
      c => c.id.toString() === 'idp',
    )!;
    const caasIdp = specializeAndInstantiate('CaaS').components.find(
      c => c.id.toString() === 'idp',
    )!;

    for (const key of NEUTRAL_KEYS) {
      expect(awsIdp.parameters.getOptionalFieldByName(key)).toEqual(
        caasIdp.parameters.getOptionalFieldByName(key),
      );
    }

    // And the values are the ones the dev set through the interface.
    expect(awsIdp.parameters.getOptionalFieldByName('userDirectoryName')).toBe(
      'acme-users',
    );
    expect(awsIdp.parameters.getOptionalFieldByName('mfaConfiguration')).toBe(
      'OPTIONAL',
    );
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specializeAndInstantiate('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('identity');
    expect(ls.genericProvider).toBe('AWS');
  });
});

describe('IdentityFractal — interface and offer-selection guarantees', () => {
  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorIdentityFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-prod', environment, provider: 'GCP'}),
    ).toThrow(/No IdP offer/);
  });

  it('returns the interface from every operation for fluent chaining', () => {
    const fractal = authorIdentityFractal();
    const returned = fractal.operations.withUserDirectory('acme-users');
    expect(returned).toBe(fractal.operations);
    expect(typeof returned.withMfa).toBe('function');
  });

  it('serializes both candidate offers onto the Blueprint Services', () => {
    const idp = authorIdentityFractal().blueprint.components.find(
      c => c.id.toString() === 'idp',
    )!;
    const offerTypes = (idp.services ?? [])
      .flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Security.CaaS.Keycloak',
      'Security.PaaS.Cognito',
    ]);
  });
});
