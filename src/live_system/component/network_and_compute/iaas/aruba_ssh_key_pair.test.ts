/**
 * aruba_ssh_key_pair.test.ts
 *
 * Migrated to the Fractal + Interface model. The infra team authors a Fractal
 * whose SshKeyPair abstract component carries the ArubaSshKeyPair offer; the dev
 * specializes ONLY through the Interface (vendor-neutral publicKey / keyName).
 * The provider selects the concrete offer at LiveSystem time.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../../../../fractal/create_fractal';
import {SshKeyPair} from '../../../../fractal/component/network_and_compute/iaas/ssh_key_pair';
import {ArubaSshKeyPair} from './aruba_ssh_key_pair';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {OwnerType} from '../../../../values/owner_type';
import {OwnerId} from '../../../../values/owner_id';
import {getBoundedContextIdBuilder} from '../../../../bounded_context/id';
import {getEnvironmentBuilder} from '../../../../environment/entity';
import {getEnvironmentIdBuilder} from '../../../../environment/id';

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
function authorSshKeyPairFractal() {
  return createFractal({
    id: 'ssh-access',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed SSH key pair',
    boundedContextId,
    blueprint: bp => ({
      key: bp.add(
        SshKeyPair.create({
          id: 'key',
          displayName: 'Operator SSH Key',
          offers: [ArubaSshKeyPair],
        }),
      ),
    }),
    operations: bp => ({
      withPublicKey: (publicKey: string) => bp.key.set('publicKey', publicKey),
      withKeyName: (keyName: string) => bp.key.set('keyName', keyName),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specializeAndInstantiate(provider: 'Aruba' | 'AWS') {
  const fractal = authorSshKeyPairFractal();

  fractal.operations
    .withPublicKey('ssh-rsa AAAA... user@host')
    .withKeyName('prod-key');

  return fractal.toLiveSystem({name: 'acme-prod', environment, provider});
}

describe('SshKeyPairFractal — provider-driven offer swap', () => {
  const NEUTRAL_KEYS = ['publicKey', 'keyName'];

  it('selects ArubaSshKeyPair on Aruba from the authored Fractal', () => {
    const aruba = specializeAndInstantiate('Aruba');
    const key = aruba.components.find(c => c.id.toString() === 'key')!;

    expect(key).toBeDefined();
    expect(key.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaSshKeyPair');
    expect(key.provider).toBe('Aruba');
  });

  it('flows the dev-set neutral parameters into the selected offer', () => {
    const key = specializeAndInstantiate('Aruba').components.find(
      c => c.id.toString() === 'key',
    )!;

    for (const k of NEUTRAL_KEYS) {
      expect(key.parameters.getOptionalFieldByName(k)).toBeDefined();
    }

    expect(key.parameters.getOptionalFieldByName('publicKey')).toBe(
      'ssh-rsa AAAA... user@host',
    );
    expect(key.parameters.getOptionalFieldByName('keyName')).toBe('prod-key');
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specializeAndInstantiate('Aruba');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('ssh-access');
    expect(ls.genericProvider).toBe('Aruba');
  });
});

describe('SshKeyPairFractal — interface and offer-selection guarantees', () => {
  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorSshKeyPairFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-prod', environment, provider: 'AWS'}),
    ).toThrow(/No SshKeyPair offer/);
  });

  it('returns the interface from every operation for fluent chaining', () => {
    const fractal = authorSshKeyPairFractal();
    const returned = fractal.operations.withPublicKey('ssh-rsa AAAA...');
    expect(returned).toBe(fractal.operations);
    expect(typeof returned.withKeyName).toBe('function');
  });

  it('serializes the candidate offer onto the Blueprint Services', () => {
    const key = authorSshKeyPairFractal().blueprint.components.find(
      c => c.id.toString() === 'key',
    )!;
    const offerTypes = (key.services ?? [])
      .flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['NetworkAndCompute.IaaS.ArubaSshKeyPair']);

    const serviceTypes = (key.services ?? [])
      .map(s => s.type.toString())
      .sort();
    expect(serviceTypes).toEqual(['NetworkAndCompute.IaaS.SshKeyPair']);
  });
});
