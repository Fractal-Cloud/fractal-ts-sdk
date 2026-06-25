/**
 * storage_columnorientedentity.test.ts
 *
 * M2 migration proof for the Storage "ColumnOrientedEntity" capability under the
 * Fractal + Interface model. Mirrors samples/network_and_compute_virtual_network_fractal.test.ts
 * and samples/foundations_pattern.test.ts:
 *
 *   - An infra team authors ONE Fractal whose ColumnOrientedEntity abstract
 *     component carries the candidate Offers (GcpBigTableTable/GCP).
 *   - The Provider chosen at LiveSystem time selects the offer; the neutral
 *     params, declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No ColumnOrientedEntity offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ColumnOrientedEntity} from '../fractal/component/storage/paas/column_oriented_entity';
import {GcpBigTableTable} from '../live_system/component/storage/paas/gcp_bigtable_table';
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

// The capability depends on a ColumnOrientedDbms — declared on the abstract
// component and inherited by whichever offer the provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('column-oriented-dbms'))
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
function authorColumnOrientedFractal() {
  return createFractal({
    id: 'column-store',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed column-oriented entity',
    boundedContextId,
    blueprint: bp => ({
      table: bp.add(
        ColumnOrientedEntity.create({
          id: 'table',
          displayName: 'Wide-column Table',
          offers: [GcpBigTableTable],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      // tableId is a vendor-only knob on the GCP offer; it rides through as a
      // neutral parameter since it is the sole offer.
      withTableId: (tableId: string) => bp.table.set('tableId', tableId),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorColumnOrientedFractal();
  fractal.operations.withTableId('events');
  return fractal.toLiveSystem({name: 'acme-table', environment, provider});
}

describe('ColumnOrientedEntity Fractal — provider-driven offer swap', () => {
  it('selects the GCP offer type/provider from one authored Fractal', () => {
    const ls = specialize('GCP');
    const table = ls.components.find(c => c.id.toString() === 'table')!;
    expect(table).toBeDefined();
    expect(table.type.toString()).toBe('Storage.PaaS.BigTableTable');
    expect(table.provider).toBe('GCP');
    // No vendor sub-components for this offer.
    expect(ls.components.length).toBe(1);
  });

  it('flows neutral params, declared deps and links into the selected offer', () => {
    const table = specialize('GCP').components.find(
      c => c.id.toString() === 'table',
    )!;

    expect(table.parameters.getOptionalFieldByName('tableId')).toBe('events');

    expect(
      table.dependencies.some(d => d.id.toString() === 'column-oriented-dbms'),
    ).toBe(true);
    expect(table.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('GCP');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('column-store');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('GCP');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorColumnOrientedFractal().blueprint;
    const table = blueprint.components.find(c => c.id.toString() === 'table')!;

    expect(table.services).toBeDefined();
    const serviceTypes = table.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Storage.PaaS.ColumnOrientedEntity']);

    const offerTypes = table
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual(['Storage.PaaS.BigTableTable']);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorColumnOrientedFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-table', environment, provider: 'AWS'}),
    ).toThrow(/No ColumnOrientedEntity offer/);
  });
});
