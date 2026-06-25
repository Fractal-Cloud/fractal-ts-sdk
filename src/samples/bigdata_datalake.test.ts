/**
 * bigdata_datalake.test.ts
 *
 * M4 migration proof for the BigData "Datalake" capability under the Fractal +
 * Interface model. Mirrors samples/storage_relationaldatabase.test.ts and
 * samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Datalake abstract component carries
 *     the candidate Offers (AwsS3Datalake/AWS, AzureDatalake/Azure,
 *     GcpDatalake/GCP).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the params, declared
 *     dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Datalake offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Datalake} from '../fractal/component/big_data/paas/datalake';
import {AwsS3Datalake} from '../live_system/component/big_data/paas/aws_s3_datalake';
import {AzureDatalake} from '../live_system/component/big_data/paas/azure_datalake';
import {GcpDatalake} from '../live_system/component/big_data/paas/gcp_datalake';
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
function authorDatalakeFractal() {
  return createFractal({
    id: 'datalake',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed data lake',
    boundedContextId,
    blueprint: bp => ({
      datalake: bp.add(
        Datalake.create({
          id: 'datalake',
          displayName: 'Analytics Data Lake',
          offers: [AwsS3Datalake, AzureDatalake, GcpDatalake],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withRetentionTier: (tier: string) =>
        bp.datalake.set('retentionTier', tier),
      withEncryption: (encryption: string) =>
        bp.datalake.set('encryption', encryption),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorDatalakeFractal();
  fractal.operations.withRetentionTier('cold');
  fractal.operations.withEncryption('aes-256');
  return fractal.toLiveSystem({name: 'acme-datalake', environment, provider});
}

describe('Datalake Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'BigData.PaaS.S3'],
      ['Azure', 'BigData.PaaS.StorageAccount'],
      ['GCP', 'BigData.PaaS.CloudStorage'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const lake = ls.components.find(c => c.id.toString() === 'datalake')!;
      expect(lake).toBeDefined();
      expect(lake.type.toString()).toBe(expectedType);
      expect(lake.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical params, declared deps and links to whichever offer the provider selects', () => {
    const awsLake = specialize('AWS').components.find(
      c => c.id.toString() === 'datalake',
    )!;
    const azureLake = specialize('Azure').components.find(
      c => c.id.toString() === 'datalake',
    )!;
    const gcpLake = specialize('GCP').components.find(
      c => c.id.toString() === 'datalake',
    )!;

    // params set via the interface — identical across providers
    for (const lake of [awsLake, azureLake, gcpLake]) {
      expect(lake.parameters.getOptionalFieldByName('retentionTier')).toBe(
        'cold',
      );
      expect(lake.parameters.getOptionalFieldByName('encryption')).toBe(
        'aes-256',
      );
    }

    // declared dependency + link inherited by every offer
    for (const lake of [awsLake, azureLake, gcpLake]) {
      expect(
        lake.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(lake.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('datalake');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorDatalakeFractal().blueprint;
    const datalake = blueprint.components.find(
      c => c.id.toString() === 'datalake',
    )!;

    expect(datalake.services).toBeDefined();
    // All three offers share the PaaS delivery model → one Service.
    const serviceTypes = datalake.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['BigData.PaaS.Datalake']);

    const offerTypes = datalake
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'BigData.PaaS.CloudStorage',
      'BigData.PaaS.S3',
      'BigData.PaaS.StorageAccount',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorDatalakeFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-datalake',
        environment,
        provider: 'OCI' as LiveSystemComponent.Provider,
      }),
    ).toThrow(/No Datalake offer/);
  });
});
