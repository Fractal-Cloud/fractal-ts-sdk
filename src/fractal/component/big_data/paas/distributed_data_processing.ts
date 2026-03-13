import {getBlueprintComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {BlueprintComponent} from '../../index';
import {BlueprintComponentDependency} from '../../dependency';
import {ComputeClusterComponent} from './compute_cluster';
import {DataProcessingJobComponent} from './data_processing_job';
import {MlExperimentComponent} from './ml_experiment';

export const DISTRIBUTED_DATA_PROCESSING_TYPE_NAME =
  'DistributedDataProcessing';
// ── internal helpers ──────────────────────────────────────────────────────────

function buildId(id: string): ComponentId {
  return getComponentIdBuilder()
    .withValue(KebabCaseString.getBuilder().withValue(id).build())
    .build();
}

function buildVersion(major: number, minor: number, patch: number): Version {
  return getVersionBuilder()
    .withMajor(major)
    .withMinor(minor)
    .withPatch(patch)
    .build();
}

function buildDistributedDataProcessingType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(DISTRIBUTED_DATA_PROCESSING_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DistributedDataProcessingComponent = {
  readonly platform: BlueprintComponent;
  readonly clusters: ReadonlyArray<ComputeClusterComponent>;
  readonly jobs: ReadonlyArray<DataProcessingJobComponent>;
  readonly experiments: ReadonlyArray<MlExperimentComponent>;
  withClusters: (
    clusters: ComputeClusterComponent[],
  ) => DistributedDataProcessingComponent;
  withJobs: (
    jobs: DataProcessingJobComponent[],
  ) => DistributedDataProcessingComponent;
  withExperiments: (
    experiments: MlExperimentComponent[],
  ) => DistributedDataProcessingComponent;
};

export type DistributedDataProcessingBuilder = {
  withId: (id: string) => DistributedDataProcessingBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => DistributedDataProcessingBuilder;
  withDisplayName: (displayName: string) => DistributedDataProcessingBuilder;
  withDescription: (description: string) => DistributedDataProcessingBuilder;
  build: () => BlueprintComponent;
};

export type DistributedDataProcessingConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeDistributedDataProcessingComponent(
  platform: BlueprintComponent,
  clusterNodes: ComputeClusterComponent[],
  jobNodes: DataProcessingJobComponent[],
  experimentNodes: MlExperimentComponent[],
): DistributedDataProcessingComponent {
  const platformDep: BlueprintComponentDependency = {id: platform.id};
  const wireDep = <T extends {component: BlueprintComponent}>(
    nodes: T[],
  ): T[] =>
    nodes.map(n => ({
      ...n,
      component: {
        ...n.component,
        dependencies: [...n.component.dependencies, platformDep],
      },
    }));
  return {
    platform,
    clusters: wireDep(clusterNodes),
    jobs: wireDep(jobNodes),
    experiments: wireDep(experimentNodes),
    withClusters: newClusters =>
      makeDistributedDataProcessingComponent(
        platform,
        newClusters,
        jobNodes,
        experimentNodes,
      ),
    withJobs: newJobs =>
      makeDistributedDataProcessingComponent(
        platform,
        clusterNodes,
        newJobs,
        experimentNodes,
      ),
    withExperiments: newExperiments =>
      makeDistributedDataProcessingComponent(
        platform,
        clusterNodes,
        jobNodes,
        newExperiments,
      ),
  };
}

export namespace DistributedDataProcessing {
  export const getBuilder = (): DistributedDataProcessingBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildDistributedDataProcessingType())
      .withParameters(params);

    const builder: DistributedDataProcessingBuilder = {
      withId: id => {
        inner.withId(buildId(id));
        return builder;
      },
      withVersion: (major, minor, patch) => {
        inner.withVersion(buildVersion(major, minor, patch));
        return builder;
      },
      withDisplayName: displayName => {
        inner.withDisplayName(displayName);
        return builder;
      },
      withDescription: description => {
        inner.withDescription(description);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: DistributedDataProcessingConfig,
  ): DistributedDataProcessingComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeDistributedDataProcessingComponent(b.build(), [], [], []);
  };
}
