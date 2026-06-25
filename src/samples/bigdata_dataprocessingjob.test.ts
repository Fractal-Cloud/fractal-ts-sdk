/**
 * bigdata_dataprocessingjob.test.ts
 *
 * M4 migration proof for the BigData "DataProcessingJob" capability under the
 * Fractal + Interface model. Mirrors samples/storage_relationaldatabase.test.ts
 * and samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose DataProcessingJob abstract
 *     component carries the candidate Offers (AwsDatabricksJob/AWS,
 *     AzureDatabricksJob/Azure, GcpDatabricksJob/GCP, CaaSSparkJob/CaaS).
 *   - A dev specializes through the Interface only (set `jobName`, `taskType`,
 *     `artifactUri`, `entryPoint`, ...), never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service(s).
 *   - An unknown provider throws `No DataProcessingJob offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {DataProcessingJob} from '../fractal/component/big_data/paas/data_processing_job';
import {AwsDatabricksJob} from '../live_system/component/big_data/paas/aws_databricks_job';
import {AzureDatabricksJob} from '../live_system/component/big_data/paas/azure_databricks_job';
import {GcpDatabricksJob} from '../live_system/component/big_data/paas/gcp_databricks_job';
import {CaaSSparkJob} from '../live_system/component/big_data/caas/caas_spark_job';
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

// A dependency (the compute cluster running the job) and a link the abstract
// component declares — both must be inherited by whichever offer the provider
// selects.
const clusterDependencyId = getComponentIdBuilder()
  .withValue(kebab('compute-cluster'))
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
function authorJobFractal() {
  return createFractal({
    id: 'data-job',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed data-processing job',
    boundedContextId,
    blueprint: bp => ({
      job: bp.add(
        DataProcessingJob.create({
          id: 'data-job',
          displayName: 'Daily ETL Job',
          offers: [
            AwsDatabricksJob,
            AzureDatabricksJob,
            GcpDatabricksJob,
            CaaSSparkJob,
          ],
          dependencies: [{id: clusterDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withJobName: (name: string) => bp.job.set('jobName', name),
      withTaskType: (taskType: string) => bp.job.set('taskType', taskType),
      withArtifactUri: (uri: string) => bp.job.set('artifactUri', uri),
      withEntryPoint: (entry: string) => bp.job.set('entryPoint', entry),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorJobFractal();
  fractal.operations.withJobName('daily-etl');
  fractal.operations.withTaskType('python_wheel');
  fractal.operations.withArtifactUri('https://registry.example/etl-1.0.0.whl');
  fractal.operations.withEntryPoint('etl.main:run');
  return fractal.toLiveSystem({name: 'acme-job', environment, provider});
}

describe('DataProcessingJob Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'BigData.PaaS.DatabricksJob'],
      ['Azure', 'BigData.PaaS.DatabricksJob'],
      ['GCP', 'BigData.PaaS.DatabricksJob'],
      ['CaaS', 'BigData.CaaS.SparkJob'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const job = ls.components.find(c => c.id.toString() === 'data-job')!;
      expect(job).toBeDefined();
      expect(job.type.toString()).toBe(expectedType);
      expect(job.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const awsJob = specialize('AWS').components.find(
      c => c.id.toString() === 'data-job',
    )!;
    const caasJob = specialize('CaaS').components.find(
      c => c.id.toString() === 'data-job',
    )!;

    // neutral params set via the interface — identical across providers
    expect(awsJob.parameters.getOptionalFieldByName('jobName')).toBe(
      'daily-etl',
    );
    expect(awsJob.parameters.getOptionalFieldByName('taskType')).toBe(
      'python_wheel',
    );
    expect(awsJob.parameters.getOptionalFieldByName('artifactUri')).toBe(
      'https://registry.example/etl-1.0.0.whl',
    );
    expect(awsJob.parameters.getOptionalFieldByName('entryPoint')).toBe(
      'etl.main:run',
    );
    expect(awsJob.parameters.getOptionalFieldByName('jobName')).toEqual(
      caasJob.parameters.getOptionalFieldByName('jobName'),
    );
    expect(awsJob.parameters.getOptionalFieldByName('artifactUri')).toEqual(
      caasJob.parameters.getOptionalFieldByName('artifactUri'),
    );

    // declared dependency + link inherited by every offer
    for (const job of [awsJob, caasJob]) {
      expect(
        job.dependencies.some(d => d.id.toString() === 'compute-cluster'),
      ).toBe(true);
      expect(job.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('data-job');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service(s)', () => {
    const blueprint = authorJobFractal().blueprint;
    const job = blueprint.components.find(c => c.id.toString() === 'data-job')!;

    expect(job.services).toBeDefined();
    // PaaS offers (3) group into one Service; the CaaS offer into another.
    const serviceTypes = job.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual([
      'BigData.CaaS.DataProcessingJob',
      'BigData.PaaS.DataProcessingJob',
    ]);

    const offerTypes = job
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'BigData.CaaS.SparkJob',
      'BigData.PaaS.DatabricksJob',
      'BigData.PaaS.DatabricksJob',
      'BigData.PaaS.DatabricksJob',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorJobFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-job', environment, provider: 'OCI'}),
    ).toThrow(/No DataProcessingJob offer/);
  });
});
