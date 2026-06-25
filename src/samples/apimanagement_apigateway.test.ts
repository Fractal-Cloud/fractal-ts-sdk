/**
 * apimanagement_apigateway.test.ts
 *
 * M5 migration proof for the APIManagement "APIGateway" capability under the
 * Fractal + Interface model. Mirrors samples/storage_relationaldatabase.test.ts
 * and samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose APIGateway abstract component
 *     carries the candidate Offers (Ambassador/CaaS, Traefik/CaaS).
 *   - A dev specializes through the Interface only (set `namespace`), never
 *     naming a vendor offer.
 *   - Both offers run on the CaaS provider, so the offer-swap is driven by which
 *     candidate the author lists first for that provider: the same authored
 *     Fractal, with the candidate order swapped, selects a different offer
 *     `type` while the neutral params, declared dependencies and links flow
 *     through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No APIGateway offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {APIGateway} from '../fractal/component/api_management/caas/api_gateway';
import {Ambassador} from '../live_system/component/api_management/caas/ambassador';
import {Traefik} from '../live_system/component/api_management/caas/traefik';
import {Offer} from '../fractal/offer';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {getComponentIdBuilder} from '../component/id';
import {getLinkBuilder} from '../component/link';
import {getComponentTypeBuilder} from '../component/type';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {PascalCaseString} from '../values/pascal_case_string';
import {getParametersInstance} from '../values/generic_parameters';
import {LiveSystemComponent} from '../live_system/component';

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

// A dependency and a link the abstract component declares — both must be
// inherited by whichever offer the provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('some-prerequisite'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('linked-thing')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once, parameterized by candidate order. ───
function authorGatewayFractal(offers: Offer[]) {
  return createFractal({
    id: 'api-gateway',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed API gateway',
    boundedContextId,
    blueprint: bp => ({
      gateway: bp.add(
        APIGateway.create({
          id: 'api-gateway',
          displayName: 'API Gateway',
          offers,
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withNamespace: (namespace: string) =>
        bp.gateway.set('namespace', namespace),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(offers: Offer[], provider: LiveSystemComponent.Provider) {
  const fractal = authorGatewayFractal(offers);
  fractal.operations.withNamespace('edge');
  return fractal.toLiveSystem({name: 'acme-gateway', environment, provider});
}

describe('APIGateway Fractal — candidate-driven offer swap', () => {
  it('selects a different offer type from one authored Fractal when the candidate order is swapped', () => {
    // Both offers run on CaaS; the first candidate for the provider wins.
    const cases: Array<[Offer[], string]> = [
      [[Ambassador, Traefik], 'APIManagement.CaaS.Ambassador'],
      [[Traefik, Ambassador], 'APIManagement.CaaS.Traefik'],
    ];

    for (const [offers, expectedType] of cases) {
      const ls = specialize(offers, 'CaaS');
      const gateway = ls.components.find(
        c => c.id.toString() === 'api-gateway',
      )!;
      expect(gateway).toBeDefined();
      expect(gateway.type.toString()).toBe(expectedType);
      expect(gateway.provider).toBe('CaaS');
      // No vendor sub-components for either offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer is selected', () => {
    const ambassadorGateway = specialize(
      [Ambassador, Traefik],
      'CaaS',
    ).components.find(c => c.id.toString() === 'api-gateway')!;
    const traefikGateway = specialize(
      [Traefik, Ambassador],
      'CaaS',
    ).components.find(c => c.id.toString() === 'api-gateway')!;

    // neutral param set via the interface — identical across offers
    expect(
      ambassadorGateway.parameters.getOptionalFieldByName('namespace'),
    ).toBe('edge');
    expect(
      ambassadorGateway.parameters.getOptionalFieldByName('namespace'),
    ).toEqual(traefikGateway.parameters.getOptionalFieldByName('namespace'));

    // declared dependency + link inherited by every offer
    for (const gateway of [ambassadorGateway, traefikGateway]) {
      expect(
        gateway.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(gateway.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize([Ambassador, Traefik], 'CaaS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('api-gateway');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('CaaS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorGatewayFractal([Ambassador, Traefik]).blueprint;
    const gateway = blueprint.components.find(
      c => c.id.toString() === 'api-gateway',
    )!;

    expect(gateway.services).toBeDefined();
    // Both offers share the CaaS delivery model → one Service.
    const serviceTypes = gateway.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['APIManagement.CaaS.APIGateway']);

    const offerTypes = gateway
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'APIManagement.CaaS.Ambassador',
      'APIManagement.CaaS.Traefik',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorGatewayFractal([Ambassador, Traefik]);
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-gateway',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No APIGateway offer/);
  });
});
