/**
 * aruba_container_registry.test.ts
 *
 * Fractal + Interface proof for the ContainerRegistry capability. The infra team
 * authors a Fractal whose ContainerRegistry abstract component carries the
 * ArubaContainerRegistry offer; the dev specializes through the Interface only
 * (neutral `size`), and the Aruba provider selects the offer at LiveSystem time.
 *
 * Replaces the legacy sibling test that exercised the removed
 * `ArubaContainerRegistry.create(...)` builder API.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../../../../fractal/create_fractal';
import {ContainerRegistry} from '../../../../fractal/component/network_and_compute/paas/container_registry';
import {ArubaContainerRegistry} from './aruba_container_registry';
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
function authorRegistryFractal() {
  return createFractal({
    id: 'container-registry',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed container image registry',
    boundedContextId,
    blueprint: bp => ({
      registry: bp.add(
        ContainerRegistry.create({
          id: 'registry',
          displayName: 'Container Image Registry',
          offers: [ArubaContainerRegistry],
        }),
      ),
    }),
    operations: bp => ({
      withSize: (size: string) => bp.registry.set('size', size),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: 'Aruba') {
  const fractal = authorRegistryFractal();
  fractal.operations.withSize('Medium');
  return fractal.toLiveSystem({name: 'acme-registry', environment, provider});
}

describe('ContainerRegistry Fractal — Aruba offer', () => {
  it('selects ArubaContainerRegistry for the Aruba provider', () => {
    const ls = specialize('Aruba');
    const registry = ls.components.find(c => c.id.toString() === 'registry')!;

    expect(registry).toBeDefined();
    expect(registry.type.toString()).toBe(
      'NetworkAndCompute.PaaS.ArubaContainerRegistry',
    );
    expect(registry.provider).toBe('Aruba');
  });

  it('flows the neutral `size` parameter into the selected offer', () => {
    const registry = specialize('Aruba').components.find(
      c => c.id.toString() === 'registry',
    )!;
    expect(registry.parameters.getOptionalFieldByName('size')).toBe('Medium');
  });

  it('emits no vendor sub-components for the Aruba offer', () => {
    const ls = specialize('Aruba');
    expect(ls.components.length).toBe(1);
  });

  it('produces a real, validated LiveSystem', () => {
    const ls = specialize('Aruba');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('container-registry');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Aruba');
  });

  it('serializes the candidate offer onto the Blueprint Service', () => {
    const registry = authorRegistryFractal().blueprint.components.find(
      c => c.id.toString() === 'registry',
    )!;

    const serviceTypes = (registry.services ?? [])
      .map(s => s.type.toString())
      .sort();
    expect(serviceTypes).toEqual(['NetworkAndCompute.PaaS.ContainerRegistry']);

    const offerTypes = (registry.services ?? [])
      .flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'NetworkAndCompute.PaaS.ArubaContainerRegistry',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorRegistryFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-registry',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No ContainerRegistry offer/);
  });
});
