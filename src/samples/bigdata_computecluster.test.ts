/**
 * bigdata_computecluster.test.ts
 *
 * M4 migration proof for the BigData "ComputeCluster" capability under the
 * Fractal + Interface model. Mirrors samples/storage_relationaldatabase.test.ts
 * and samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose ComputeCluster abstract component
 *     carries the candidate Offers (AwsDatabricksCluster/AWS,
 *     AzureDatabricksCluster/Azure, GcpDatabricksCluster/GCP,
 *     CaaSSparkCluster/CaaS).
 *   - A dev specializes through the Interface only (set neutral cluster knobs),
 *     never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Services (one per
 *     delivery model: PaaS for the Databricks offers, CaaS for Spark-on-K8s).
 *   - Every cluster carries the default DistributedDataProcessing dependency.
 *   - An unknown provider throws `No ComputeCluster offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ComputeCluster} from '../fractal/component/big_data/paas/compute_cluster';
import {AwsDatabricksCluster} from '../live_system/component/big_data/paas/aws_databricks_cluster';
import {AzureDatabricksCluster} from '../live_system/component/big_data/paas/azure_databricks_cluster';
import {GcpDatabricksCluster} from '../live_system/component/big_data/paas/gcp_databricks_cluster';
import {CaaSSparkCluster} from '../live_system/component/big_data/caas/caas_spark_cluster';
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
function authorComputeClusterFractal() {
  return createFractal({
    id: 'compute-cluster',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed Spark compute cluster',
    boundedContextId,
    blueprint: bp => ({
      cluster: bp.add(
        ComputeCluster.create({
          id: 'compute-cluster',
          displayName: 'Spark Compute Cluster',
          offers: [
            AwsDatabricksCluster,
            AzureDatabricksCluster,
            GcpDatabricksCluster,
            CaaSSparkCluster,
          ],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withClusterName: (name: string) => bp.cluster.set('clusterName', name),
      withSparkVersion: (version: string) =>
        bp.cluster.set('sparkVersion', version),
      withNumWorkers: (num: number) => bp.cluster.set('numWorkers', num),
      withAutoTerminationMinutes: (minutes: number) =>
        bp.cluster.set('autoTerminationMinutes', minutes),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorComputeClusterFractal();
  fractal.operations.withClusterName('analytics');
  fractal.operations.withSparkVersion('14.3.x-scala2.12');
  fractal.operations.withNumWorkers(4);
  fractal.operations.withAutoTerminationMinutes(30);
  return fractal.toLiveSystem({name: 'acme-cluster', environment, provider});
}

describe('ComputeCluster Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'BigData.PaaS.DatabricksCluster'],
      ['Azure', 'BigData.PaaS.DatabricksCluster'],
      ['GCP', 'BigData.PaaS.DatabricksCluster'],
      ['CaaS', 'BigData.CaaS.SparkCluster'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const cluster = ls.components.find(
        c => c.id.toString() === 'compute-cluster',
      )!;
      expect(cluster).toBeDefined();
      expect(cluster.type.toString()).toBe(expectedType);
      expect(cluster.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const awsCluster = specialize('AWS').components.find(
      c => c.id.toString() === 'compute-cluster',
    )!;
    const caasCluster = specialize('CaaS').components.find(
      c => c.id.toString() === 'compute-cluster',
    )!;

    // neutral params set via the interface — identical across providers
    expect(awsCluster.parameters.getOptionalFieldByName('clusterName')).toBe(
      'analytics',
    );
    expect(awsCluster.parameters.getOptionalFieldByName('sparkVersion')).toBe(
      '14.3.x-scala2.12',
    );
    expect(awsCluster.parameters.getOptionalFieldByName('numWorkers')).toBe(4);
    expect(
      awsCluster.parameters.getOptionalFieldByName('autoTerminationMinutes'),
    ).toBe(30);

    for (const key of [
      'clusterName',
      'sparkVersion',
      'numWorkers',
      'autoTerminationMinutes',
    ]) {
      expect(awsCluster.parameters.getOptionalFieldByName(key)).toEqual(
        caasCluster.parameters.getOptionalFieldByName(key),
      );
    }

    // declared dependency + default platform dependency + link inherited by
    // every offer
    for (const cluster of [awsCluster, caasCluster]) {
      expect(
        cluster.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(
        cluster.dependencies.some(
          d => d.id.toString() === 'distributed-data-processing',
        ),
      ).toBe(true);
      expect(cluster.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('compute-cluster');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });

  it('serializes candidate offers onto the Blueprint component Services', () => {
    const blueprint = authorComputeClusterFractal().blueprint;
    const cluster = blueprint.components.find(
      c => c.id.toString() === 'compute-cluster',
    )!;

    expect(cluster.services).toBeDefined();
    // PaaS offers share one Service; the CaaS offer forms a second Service.
    const serviceTypes = cluster.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual([
      'BigData.CaaS.ComputeCluster',
      'BigData.PaaS.ComputeCluster',
    ]);

    const offerTypes = cluster
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'BigData.CaaS.SparkCluster',
      'BigData.PaaS.DatabricksCluster',
      'BigData.PaaS.DatabricksCluster',
      'BigData.PaaS.DatabricksCluster',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorComputeClusterFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-cluster',
        environment,
        provider: 'OCI',
      }),
    ).toThrow(/No ComputeCluster offer/);
  });
});
