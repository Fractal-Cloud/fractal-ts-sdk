/**
 * live_system_problems.test.ts — a Live System's components must name offer
 * types an agent can claim, and refer only to each other.
 *
 * The control plane accepts a component whose offer it holds no contract for
 * (unchecked, never refused), and an agent skips a type it registers no handler
 * for: such a component sits in Instantiating with nothing said. So the SDK
 * refuses one before it is submitted, naming the component and the valid
 * options. The typed path (`toLiveSystem` with a typed `select`) cannot produce
 * one; a Live System written by hand, or an offer defined with `defineOffer`
 * on a catalogue COMPONENT type, could.
 */
import {describe, expect, it} from 'vitest';
import {createFractal, defineOffer} from './core';
import type {LiveSystem, LiveSystemComponent} from './core';
import {
  ComputeCluster,
  DataProcessingJob,
  Datalake,
  DistributedDataProcessing,
  MlExperiment,
} from './components/big_data';
import {ObjectStorage} from './components/storage';
import {
  AzureDatabricks,
  AzureDatabricksCluster,
  AzureDatabricksJob,
  AzureDatabricksMlflow,
  AzureDatalake,
} from './offers/big_data';
import {liveSystemProblems} from './live_system_problems';
import {LiveSystemStructureError} from './validation/live_system_structure_error';
import type {DatalakeLink} from './components/datalake_link';

const OWNER = '00000000-0000-0000-0000-000000000001';
const environment = {ownerType: 'Personal', ownerId: OWNER, name: 'dev'};

/** The shape the customer's generated code authored: a Databricks workspace
 *  with a cluster, an ETL job on both, an ML experiment and a data lake. */
const dataPlatform = () =>
  createFractal({
    id: 'data-processing-platform',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {ownerType: 'Personal', ownerId: OWNER, name: 'bc'},
    blueprint: bp => {
      const workspace = bp.add(
        DistributedDataProcessing({
          id: 'analytics-workspace',
          displayName: 'Analytics Workspace',
        }),
      );
      const cluster = bp.add(
        ComputeCluster({
          id: 'analytics-cluster',
          displayName: 'Analytics Cluster',
        })
          .withMaxWorkers(10)
          .dependsOn(workspace),
      );
      const job = bp.add(
        DataProcessingJob({id: 'etl-job', displayName: 'ETL Job'})
          .withMaxRetries(3)
          .dependsOn(cluster)
          .dependsOn(workspace),
      );
      const experiment = bp.add(
        MlExperiment({
          id: 'fraud-model',
          displayName: 'Fraud Detection Model',
        }).dependsOn(workspace),
      );
      const lake = bp.add(
        Datalake({id: 'acmebigdatalake', displayName: 'Data Lake'}),
      );
      bp.link(job, lake, {purpose: 'curated'} satisfies DatalakeLink);
      return {workspace, cluster, job, experiment, lake};
    },
  });

const builtDataPlatform = (): LiveSystem =>
  dataPlatform().toLiveSystem({
    name: 'data-processing-platform',
    environment,
    select: {
      'analytics-workspace': AzureDatabricks({pricingTier: 'premium'}),
      'analytics-cluster': AzureDatabricksCluster({}),
      'etl-job': AzureDatabricksJob({}),
      'fraud-model': AzureDatabricksMlflow({}),
      acmebigdatalake: AzureDatalake({}),
    },
  });

/** The built Live System with one component replaced. */
const withComponent = (
  id: string,
  change: Partial<LiveSystemComponent>,
): LiveSystem => {
  const ls = builtDataPlatform();
  return {
    ...ls,
    components: ls.components.map(c => (c.id === id ? {...c, ...change} : c)),
  };
};

describe('liveSystemProblems', () => {
  it('finds none in a Live System built through typed offer selection', () => {
    expect(liveSystemProblems(builtDataPlatform())).toEqual([]);
  });

  it('refuses a catalogue component type used as an offer type, naming the offers that satisfy it', () => {
    const problems = liveSystemProblems(
      withComponent('etl-job', {type: 'BigData.PaaS.DataProcessingJob'}),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Component 'etl-job'");
    expect(problems[0]).toContain("'BigData.PaaS.DataProcessingJob'");
    expect(problems[0]).toContain('catalogue component type, not an offer');
    for (const offer of [
      'BigData.PaaS.AwsDatabricksJob',
      'BigData.PaaS.AzureDatabricksJob',
      'BigData.PaaS.GcpDatabricksJob',
    ]) {
      expect(problems[0]).toContain(offer);
    }
    expect(problems[0]).not.toContain('BigData.CaaS.SparkJob');
  });

  it('refuses an offer type no agent declares, listing the known offers of its domain and model', () => {
    const [problem] = liveSystemProblems(
      withComponent('etl-job', {type: 'BigData.PaaS.AzureDatabrickJob'}),
    );
    expect(problem).toContain("Component 'etl-job'");
    expect(problem).toContain("'BigData.PaaS.AzureDatabrickJob'");
    expect(problem).toContain('no agent declares');
    expect(problem).toContain('BigData.PaaS.AzureDatabricksJob');
  });

  it('refuses a type that is not <Domain>.<DeliveryModel>.<Name>', () => {
    const [problem] = liveSystemProblems(
      withComponent('etl-job', {type: 'DataProcessingJob'}),
    );
    expect(problem).toContain("Component 'etl-job'");
    expect(problem).toContain('<Domain>.<DeliveryModel>.<Name>');
  });

  it('refuses a delivery model other than the one its offer type names', () => {
    const [problem] = liveSystemProblems(
      withComponent('etl-job', {deliveryModel: 'CaaS'}),
    );
    expect(problem).toContain("Component 'etl-job'");
    expect(problem).toContain("deliveryModel 'CaaS'");
    expect(problem).toContain("'PaaS'");
  });

  it('refuses a provider the offer type is not declared for', () => {
    const [problem] = liveSystemProblems(
      withComponent('etl-job', {provider: 'AWS'}),
    );
    expect(problem).toContain("Component 'etl-job'");
    expect(problem).toContain("provider 'AWS'");
    expect(problem).toContain('Azure');
  });

  it('refuses a dependency or a link to a component the Live System does not have', () => {
    const problems = liveSystemProblems(
      withComponent('etl-job', {
        dependencies: ['analytics-cluster', 'analytics-workspce'],
        links: [{componentId: 'datalake', settings: {}}],
      }),
    );
    expect(problems).toEqual([
      expect.stringContaining(
        "Component 'etl-job' depends on 'analytics-workspce'",
      ),
      expect.stringContaining("Component 'etl-job' links to 'datalake'"),
    ]);
    expect(problems[0]).toContain('analytics-workspace');
  });

  it('refuses two components with the same id', () => {
    const ls = builtDataPlatform();
    const [problem] = liveSystemProblems({
      ...ls,
      components: [...ls.components, {...ls.components[0]}],
    });
    expect(problem).toContain(`'${ls.components[0].id}'`);
    expect(problem).toContain('more than once');
  });

  it('accepts an offer added with defineOffer, the documented extension', () => {
    const Ceph = defineOffer<'Storage.ObjectStorage', {storageClass?: string}>({
      satisfies: 'Storage.ObjectStorage',
      offerType: 'Storage.CaaS.CephForProblemsTest',
      deliveryModel: 'CaaS',
    });
    const ls = createFractal({
      id: 'ceph',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {ownerType: 'Personal', ownerId: OWNER, name: 'bc'},
      blueprint: bp => ({
        uploads: bp.add(ObjectStorage({id: 'uploads', deliveryModel: 'CaaS'})),
      }),
    }).toLiveSystem({
      name: 'ceph',
      environment,
      select: {uploads: Ceph({storageClass: 'rbd'})},
    });
    expect(liveSystemProblems(ls)).toEqual([]);
  });
});

describe('a malformed Live System is refused where it is made', () => {
  it('toLiveSystem refuses a component a custom instantiate emits on a catalogue component type', () => {
    const Invented = defineOffer<'BigData.DataProcessingJob', object>({
      satisfies: 'BigData.DataProcessingJob',
      offerType: 'BigData.PaaS.InventedJobForProblemsTest',
      provider: 'Azure',
      deliveryModel: 'PaaS',
      instantiate: ctx => [
        {
          id: ctx.id,
          displayName: ctx.displayName,
          type: 'BigData.PaaS.DataProcessingJob',
          provider: 'Azure',
          deliveryModel: 'PaaS',
          parameters: {},
          dependencies: ctx.dependencies,
          links: ctx.links,
        },
      ],
    });
    const build = () =>
      createFractal({
        id: 'job',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId: {ownerType: 'Personal', ownerId: OWNER, name: 'bc'},
        blueprint: bp => ({job: bp.add(DataProcessingJob({id: 'etl-job'}))}),
      }).toLiveSystem({
        name: 'job',
        environment,
        select: {'etl-job': Invented({})},
      });
    expect(build).toThrow(LiveSystemStructureError);
    expect(build).toThrow(/catalogue component type, not an offer/);
  });
});

describe('defineOffer', () => {
  it('refuses a catalogue component type as the offer type, naming the offers that satisfy it', () => {
    expect(() =>
      defineOffer<'BigData.DataProcessingJob', object>({
        satisfies: 'BigData.DataProcessingJob',
        offerType: 'BigData.PaaS.DataProcessingJob',
        provider: 'Azure',
        deliveryModel: 'PaaS',
      }),
    ).toThrow(
      /'BigData\.PaaS\.DataProcessingJob' is a catalogue component type, not an offer.*BigData\.PaaS\.AzureDatabricksJob/s,
    );
  });

  it('refuses an offer type whose delivery model segment is not its deliveryModel', () => {
    expect(() =>
      defineOffer<'Storage.ObjectStorage', object>({
        satisfies: 'Storage.ObjectStorage',
        offerType: 'Storage.PaaS.CephMismatchForProblemsTest',
        deliveryModel: 'CaaS',
      }),
    ).toThrow(/'Storage\.PaaS\.CephMismatchForProblemsTest'.*CaaS/s);
  });

  it('refuses an offer type that is not <Domain>.<DeliveryModel>.<Name>, at compile time too', () => {
    expect(() =>
      defineOffer<'Storage.ObjectStorage', object>({
        satisfies: 'Storage.ObjectStorage',
        // @ts-expect-error -- an offer type names its delivery model in the middle
        offerType: 'Storage.Ceph',
        deliveryModel: 'CaaS',
      }),
    ).toThrow(/<Domain>\.<DeliveryModel>\.<Name>/);
  });
});
