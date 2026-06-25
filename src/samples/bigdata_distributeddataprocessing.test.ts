/**
 * bigdata_distributeddataprocessing.test.ts
 *
 * M4 migration proof for the BigData "DistributedDataProcessing" capability
 * under the Fractal + Interface model. Mirrors
 * samples/storage_relationaldatabase.test.ts and samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose DistributedDataProcessing abstract
 *     component carries the candidate Offers (AwsDatabricks/AWS,
 *     AzureDatabricks/Azure, GcpDatabricks/GCP).
 *   - A dev consumes through the Interface only; this capability has no
 *     vendor-neutral knobs (every Databricks setting is vendor-specific), so the
 *     Interface declares no neutral ops.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the declared
 *     dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No DistributedDataProcessing offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {DistributedDataProcessing} from '../fractal/component/big_data/paas/distributed_data_processing';
import {AwsDatabricks} from '../live_system/component/big_data/paas/aws_databricks';
import {AzureDatabricks} from '../live_system/component/big_data/paas/azure_databricks';
import {GcpDatabricks} from '../live_system/component/big_data/paas/gcp_databricks';
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
      .withInfrastructureDomain(InfrastructureDomain.BigData)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorPlatformFractal() {
  return createFractal({
    id: 'analytics-platform',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed distributed data processing platform',
    boundedContextId,
    blueprint: bp => ({
      platform: bp.add(
        DistributedDataProcessing.create({
          id: 'analytics-platform',
          displayName: 'Analytics Platform',
          offers: [AwsDatabricks, AzureDatabricks, GcpDatabricks],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    // DistributedDataProcessing has no vendor-neutral knobs — the Interface
    // exposes no neutral ops.
    operations: () => ({}),
  });
}

// ── Dev team: select a provider; no neutral specialization needed. ───────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorPlatformFractal();
  return fractal.toLiveSystem({name: 'acme-platform', environment, provider});
}

describe('DistributedDataProcessing Fractal — provider-driven offer swap', () => {
  it('selects a different offer provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'BigData.PaaS.Databricks'],
      ['Azure', 'BigData.PaaS.Databricks'],
      ['GCP', 'BigData.PaaS.Databricks'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const platform = ls.components.find(
        c => c.id.toString() === 'analytics-platform',
      )!;
      expect(platform).toBeDefined();
      expect(platform.type.toString()).toBe(expectedType);
      expect(platform.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const awsPlatform = specialize('AWS').components.find(
      c => c.id.toString() === 'analytics-platform',
    )!;
    const azurePlatform = specialize('Azure').components.find(
      c => c.id.toString() === 'analytics-platform',
    )!;
    const gcpPlatform = specialize('GCP').components.find(
      c => c.id.toString() === 'analytics-platform',
    )!;

    for (const platform of [awsPlatform, azurePlatform, gcpPlatform]) {
      expect(
        platform.dependencies.some(
          d => d.id.toString() === 'some-prerequisite',
        ),
      ).toBe(true);
      expect(platform.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('analytics-platform');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorPlatformFractal().blueprint;
    const platform = blueprint.components.find(
      c => c.id.toString() === 'analytics-platform',
    )!;

    expect(platform.services).toBeDefined();
    // All three offers share the PaaS delivery model → one Service.
    const serviceTypes = platform.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['BigData.PaaS.DistributedDataProcessing']);

    const offerTypes = platform
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'BigData.PaaS.Databricks',
      'BigData.PaaS.Databricks',
      'BigData.PaaS.Databricks',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorPlatformFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-platform',
        environment,
        provider: 'Hetzner',
      }),
    ).toThrow(/No DistributedDataProcessing offer/);
  });
});
