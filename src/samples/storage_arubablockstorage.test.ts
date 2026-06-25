/**
 * storage_arubablockstorage.test.ts
 *
 * M2 migration proof for the Storage "BlockStorage" capability under the
 * Fractal + Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose BlockStorage abstract component
 *     carries the candidate Offer (ArubaBlockStorage/Aruba).
 *   - A dev specializes through the Interface only (set `sizeGb`/`type`), never
 *     naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Selecting Aruba
 *     yields the ArubaBlockStorage offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offer onto its Service.
 *   - An unknown provider throws `No ArubaBlockStorage offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {BlockStorage} from '../fractal/component/storage/iaas/block_storage';
import {ArubaBlockStorage} from '../live_system/component/storage/iaas/aruba_block_storage';
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
      .withInfrastructureDomain(InfrastructureDomain.Storage)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorStorageFractal() {
  return createFractal({
    id: 'storage',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed block storage',
    boundedContextId,
    blueprint: bp => ({
      volume: bp.add(
        BlockStorage.create({
          id: 'volume',
          displayName: 'Data Volume',
          offers: [ArubaBlockStorage],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withSizeGb: (sizeGb: number) => bp.volume.set('sizeGb', sizeGb),
      withStorageType: (type: string) => bp.volume.set('type', type),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorStorageFractal();
  fractal.operations.withSizeGb(100);
  fractal.operations.withStorageType('Performance');
  return fractal.toLiveSystem({name: 'acme-volume', environment, provider});
}

describe('BlockStorage Fractal — provider-driven offer swap', () => {
  it('selects the ArubaBlockStorage offer type/provider for the Aruba provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Aruba', 'Storage.IaaS.ArubaBlockStorage'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const vol = ls.components.find(c => c.id.toString() === 'volume')!;
      expect(vol).toBeDefined();
      expect(vol.type.toString()).toBe(expectedType);
      expect(vol.provider).toBe(provider);
      // No vendor sub-components for this offer.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows neutral params, declared deps and links to the offer the provider selects', () => {
    const vol = specialize('Aruba').components.find(
      c => c.id.toString() === 'volume',
    )!;

    // vendor-only params set via the interface flow through to the offer
    expect(vol.parameters.getOptionalFieldByName('sizeGb')).toBe(100);
    expect(vol.parameters.getOptionalFieldByName('type')).toBe('Performance');

    // declared dependency + link inherited by the offer
    expect(
      vol.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
    ).toBe(true);
    expect(vol.links.some(l => l.id.toString() === 'linked-thing')).toBe(true);
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Aruba');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('storage');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Aruba');
  });

  it('serializes the candidate offer onto the Blueprint component Service', () => {
    const blueprint = authorStorageFractal().blueprint;
    const volume = blueprint.components.find(
      c => c.id.toString() === 'volume',
    )!;

    expect(volume.services).toBeDefined();
    const serviceTypes = volume.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.IaaS.ArubaBlockStorage']);

    const offerTypes = volume
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Storage.IaaS.ArubaBlockStorage']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorStorageFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-volume', environment, provider: 'AWS'}),
    ).toThrow(/No ArubaBlockStorage offer/);
  });
});
