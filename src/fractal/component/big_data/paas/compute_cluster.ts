import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {
  GenericParameters,
  getParametersInstance,
} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {BlueprintComponent} from '../../index';

export const COMPUTE_CLUSTER_TYPE_NAME = 'ComputeCluster';
export const CLUSTER_NAME_PARAM = 'clusterName';
export const SPARK_VERSION_PARAM = 'sparkVersion';
export const NUM_WORKERS_PARAM = 'numWorkers';
export const MIN_WORKERS_PARAM = 'minWorkers';
export const MAX_WORKERS_PARAM = 'maxWorkers';
export const SPARK_CONF_PARAM = 'sparkConf';
export const PYPI_LIBRARIES_PARAM = 'pypiLibraries';
export const MAVEN_LIBRARIES_PARAM = 'mavenLibraries';
export const AUTO_TERMINATION_MINUTES_PARAM = 'autoTerminationMinutes';

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

function buildComputeClusterType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(COMPUTE_CLUSTER_TYPE_NAME)
        .build(),
    )
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

// ── Public API ────────────────────────────────────────────────────────────────

export type ComputeClusterComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type ComputeClusterBuilder = {
  withId: (id: string) => ComputeClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ComputeClusterBuilder;
  withDisplayName: (displayName: string) => ComputeClusterBuilder;
  withDescription: (description: string) => ComputeClusterBuilder;
  withClusterName: (name: string) => ComputeClusterBuilder;
  withSparkVersion: (version: string) => ComputeClusterBuilder;
  withNumWorkers: (num: number) => ComputeClusterBuilder;
  withMinWorkers: (min: number) => ComputeClusterBuilder;
  withMaxWorkers: (max: number) => ComputeClusterBuilder;
  withSparkConf: (conf: Record<string, string>) => ComputeClusterBuilder;
  withPypiLibraries: (libs: string[]) => ComputeClusterBuilder;
  withMavenLibraries: (libs: string[]) => ComputeClusterBuilder;
  withAutoTerminationMinutes: (minutes: number) => ComputeClusterBuilder;
  build: () => BlueprintComponent;
};

export type ComputeClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  clusterName?: string;
  sparkVersion?: string;
  numWorkers?: number;
  minWorkers?: number;
  maxWorkers?: number;
  sparkConf?: Record<string, string>;
  pypiLibraries?: string[];
  mavenLibraries?: string[];
  autoTerminationMinutes?: number;
};

function makeComputeClusterComponent(
  component: BlueprintComponent,
): ComputeClusterComponent {
  return {component, components: [component]};
}

export namespace ComputeCluster {
  export const getBuilder = (): ComputeClusterBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildComputeClusterType())
      .withParameters(params);

    const builder: ComputeClusterBuilder = {
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
      withClusterName: name => {
        pushParam(params, CLUSTER_NAME_PARAM, name);
        return builder;
      },
      withSparkVersion: version => {
        pushParam(params, SPARK_VERSION_PARAM, version);
        return builder;
      },
      withNumWorkers: num => {
        pushParam(params, NUM_WORKERS_PARAM, num);
        return builder;
      },
      withMinWorkers: min => {
        pushParam(params, MIN_WORKERS_PARAM, min);
        return builder;
      },
      withMaxWorkers: max => {
        pushParam(params, MAX_WORKERS_PARAM, max);
        return builder;
      },
      withSparkConf: conf => {
        pushParam(params, SPARK_CONF_PARAM, conf);
        return builder;
      },
      withPypiLibraries: libs => {
        pushParam(params, PYPI_LIBRARIES_PARAM, libs);
        return builder;
      },
      withMavenLibraries: libs => {
        pushParam(params, MAVEN_LIBRARIES_PARAM, libs);
        return builder;
      },
      withAutoTerminationMinutes: minutes => {
        pushParam(params, AUTO_TERMINATION_MINUTES_PARAM, minutes);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: ComputeClusterConfig,
  ): ComputeClusterComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.clusterName) b.withClusterName(config.clusterName);
    if (config.sparkVersion) b.withSparkVersion(config.sparkVersion);
    if (config.numWorkers !== undefined) b.withNumWorkers(config.numWorkers);
    if (config.minWorkers !== undefined) b.withMinWorkers(config.minWorkers);
    if (config.maxWorkers !== undefined) b.withMaxWorkers(config.maxWorkers);
    if (config.sparkConf) b.withSparkConf(config.sparkConf);
    if (config.pypiLibraries) b.withPypiLibraries(config.pypiLibraries);
    if (config.mavenLibraries) b.withMavenLibraries(config.mavenLibraries);
    if (config.autoTerminationMinutes !== undefined)
      b.withAutoTerminationMinutes(config.autoTerminationMinutes);

    return makeComputeClusterComponent(b.build());
  };
}
