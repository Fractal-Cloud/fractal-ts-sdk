/**
 * aruba_elastic_ip.test.ts
 *
 * Fractal + Interface proof for the ElasticIp capability. ElasticIp currently
 * has a single candidate offer (ArubaElasticIp on Aruba), so this exercises:
 *   - the dev authors a Fractal and specializes through the Interface only,
 *   - the Provider (Aruba) selects the offer at LiveSystem time,
 *   - the offer inherits the abstract component's neutral params,
 *   - `toLiveSystem` returns a real, validated LiveSystem,
 *   - the Blueprint serializes the candidate offer onto its Service,
 *   - an unknown provider throws `No ElasticIp offer`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../../../../fractal/create_fractal';
import {ElasticIp} from '../../../../fractal/component/network_and_compute/iaas/elastic_ip';
import {ArubaElasticIp} from './aruba_elastic_ip';
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
function authorElasticIpFractal() {
  return createFractal({
    id: 'elastic-ip',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed static public IP',
    boundedContextId,
    blueprint: bp => ({
      eip: bp.add(
        ElasticIp.create({
          id: 'eip',
          displayName: 'Public Ingress IP',
          offers: [ArubaElasticIp],
        }),
      ),
    }),
    operations: bp => ({
      withLabel: (label: string) => bp.eip.set('label', label),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specializeAndInstantiate(provider: 'Aruba' | 'AWS') {
  const fractal = authorElasticIpFractal();
  fractal.operations.withLabel('ingress');
  return fractal.toLiveSystem({name: 'acme-prod', environment, provider});
}

describe('ElasticIp Fractal — provider-driven offer selection', () => {
  it('selects ArubaElasticIp on Aruba from the authored Fractal', () => {
    const ls = specializeAndInstantiate('Aruba');
    const eip = ls.components.find(c => c.id.toString() === 'eip')!;

    expect(eip).toBeDefined();
    expect(eip.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaElasticIp');
    expect(eip.provider).toBe('Aruba');
  });

  it('flows the neutral parameter the dev set through the interface to the offer', () => {
    const eip = specializeAndInstantiate('Aruba').components.find(
      c => c.id.toString() === 'eip',
    )!;
    expect(eip.parameters.getOptionalFieldByName('label')).toBe('ingress');
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specializeAndInstantiate('Aruba');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('elastic-ip');
    expect(ls.genericProvider).toBe('Aruba');
  });

  it('serializes the candidate offer onto the Blueprint Service', () => {
    const eip = authorElasticIpFractal().blueprint.components.find(
      c => c.id.toString() === 'eip',
    )!;
    const services = eip.services ?? [];
    expect(services.map(s => s.type.toString()).sort()).toEqual([
      'NetworkAndCompute.IaaS.ElasticIp',
    ]);
    const offerTypes = services
      .flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['NetworkAndCompute.IaaS.ArubaElasticIp']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorElasticIpFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-prod', environment, provider: 'AWS'}),
    ).toThrow(/No ElasticIp offer/);
  });
});
