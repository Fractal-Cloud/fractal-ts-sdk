/**
 * bigdata_mlexperiment.test.ts
 *
 * M4 migration proof for the BigData "MlExperiment" capability under the Fractal +
 * Interface model. Mirrors samples/messaging_broker.test.ts and
 * samples/storage_relationaldatabase.test.ts:
 *
 *   - An infra team authors ONE Fractal whose MlExperiment abstract component
 *     carries the candidate Offers (AwsDatabricksMlflow/AWS,
 *     AzureDatabricksMlflow/Azure, GcpDatabricksMlflow/GCP, CaaSMlflow/CaaS).
 *   - A dev specializes through the Interface only (set `experimentName`,
 *     `artifactLocation`), never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service(s).
 *   - An unknown provider throws `No MlExperiment offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {MlExperiment} from '../fractal/component/big_data/paas/ml_experiment';
import {AwsDatabricksMlflow} from '../live_system/component/big_data/paas/aws_databricks_mlflow';
import {AzureDatabricksMlflow} from '../live_system/component/big_data/paas/azure_databricks_mlflow';
import {GcpDatabricksMlflow} from '../live_system/component/big_data/paas/gcp_databricks_mlflow';
import {CaaSMlflow} from '../live_system/component/big_data/caas/caas_mlflow';
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

// Dependencies the abstract component declares — the ComputeCluster that runs the
// experiment and the DistributedDataProcessing job that produces runs. Both must
// be inherited by whichever offer the provider selects.
const computeClusterDependencyId = getComponentIdBuilder()
  .withValue(kebab('compute-cluster'))
  .build();

const dataProcessingDependencyId = getComponentIdBuilder()
  .withValue(kebab('distributed-data-processing'))
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
function authorMlExperimentFractal() {
  return createFractal({
    id: 'ml-experiment',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed ML experiment tracker',
    boundedContextId,
    blueprint: bp => ({
      experiment: bp.add(
        MlExperiment.create({
          id: 'ml-experiment',
          displayName: 'Model Training Experiment',
          offers: [
            AwsDatabricksMlflow,
            AzureDatabricksMlflow,
            GcpDatabricksMlflow,
            CaaSMlflow,
          ],
          dependencies: [
            {id: computeClusterDependencyId},
            {id: dataProcessingDependencyId},
          ],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withExperimentName: (name: string) =>
        bp.experiment.set('experimentName', name),
      withArtifactLocation: (location: string) =>
        bp.experiment.set('artifactLocation', location),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorMlExperimentFractal();
  fractal.operations.withExperimentName('/Shared/churn-model');
  fractal.operations.withArtifactLocation('dbfs:/mlflow/artifacts');
  return fractal.toLiveSystem({name: 'acme-ml', environment, provider});
}

describe('MlExperiment Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'BigData.PaaS.DatabricksMlflowExperiment'],
      ['Azure', 'BigData.PaaS.DatabricksMlflowExperiment'],
      ['GCP', 'BigData.PaaS.DatabricksMlflowExperiment'],
      ['CaaS', 'BigData.CaaS.SparkMlExperiment'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const experiment = ls.components.find(
        c => c.id.toString() === 'ml-experiment',
      )!;
      expect(experiment).toBeDefined();
      expect(experiment.type.toString()).toBe(expectedType);
      expect(experiment.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const awsExp = specialize('AWS').components.find(
      c => c.id.toString() === 'ml-experiment',
    )!;
    const caasExp = specialize('CaaS').components.find(
      c => c.id.toString() === 'ml-experiment',
    )!;

    // neutral params set via the interface — identical across providers
    expect(awsExp.parameters.getOptionalFieldByName('experimentName')).toBe(
      '/Shared/churn-model',
    );
    expect(awsExp.parameters.getOptionalFieldByName('artifactLocation')).toBe(
      'dbfs:/mlflow/artifacts',
    );
    expect(awsExp.parameters.getOptionalFieldByName('experimentName')).toEqual(
      caasExp.parameters.getOptionalFieldByName('experimentName'),
    );
    expect(
      awsExp.parameters.getOptionalFieldByName('artifactLocation'),
    ).toEqual(caasExp.parameters.getOptionalFieldByName('artifactLocation'));

    // declared dependencies + link inherited by every offer
    for (const exp of [awsExp, caasExp]) {
      expect(
        exp.dependencies.some(d => d.id.toString() === 'compute-cluster'),
      ).toBe(true);
      expect(
        exp.dependencies.some(
          d => d.id.toString() === 'distributed-data-processing',
        ),
      ).toBe(true);
      expect(exp.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('ml-experiment');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service(s)', () => {
    const blueprint = authorMlExperimentFractal().blueprint;
    const experiment = blueprint.components.find(
      c => c.id.toString() === 'ml-experiment',
    )!;

    expect(experiment.services).toBeDefined();
    // PaaS offers (AWS/Azure/GCP) group into one Service; CaaS into another.
    const serviceTypes = experiment
      .services!.map(s => s.type.toString())
      .sort();
    expect(serviceTypes).toEqual([
      'BigData.CaaS.MlExperiment',
      'BigData.PaaS.MlExperiment',
    ]);

    const offerTypes = experiment
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'BigData.CaaS.SparkMlExperiment',
      'BigData.PaaS.DatabricksMlflowExperiment',
      'BigData.PaaS.DatabricksMlflowExperiment',
      'BigData.PaaS.DatabricksMlflowExperiment',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorMlExperimentFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-ml', environment, provider: 'OCI'}),
    ).toThrow(/No MlExperiment offer/);
  });
});
