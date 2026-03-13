import {getLiveSystemComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../../../fractal/component/type';
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
import {LiveSystemComponent} from '../../index';
import {BlueprintComponent} from '../../../../fractal/component/index';
import {
  CLUSTER_NAME_PARAM,
  SPARK_VERSION_PARAM,
  NUM_WORKERS_PARAM,
  MIN_WORKERS_PARAM,
  MAX_WORKERS_PARAM,
  SPARK_CONF_PARAM,
  PYPI_LIBRARIES_PARAM,
  MAVEN_LIBRARIES_PARAM,
  AUTO_TERMINATION_MINUTES_PARAM,
} from '../../../../fractal/component/big_data/paas/compute_cluster';

const NODE_TYPE_ID_PARAM = 'nodeTypeId';
const DATA_SECURITY_MODE_PARAM = 'dataSecurityMode';

// Agent constant: DATABRICKS_CLUSTER_COMPONENT_NAME = "DatabricksCluster"
const AWS_DATABRICKS_CLUSTER_TYPE_NAME = 'DatabricksCluster';

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

function buildAwsDatabricksClusterType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_DATABRICKS_CLUSTER_TYPE_NAME)
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

/**
 * Returned by satisfy() — blueprint params are locked.
 * Exposes vendor-specific nodeTypeId.
 */
export type SatisfiedAwsDatabricksClusterBuilder = {
  withNodeTypeId: (nodeTypeId: string) => SatisfiedAwsDatabricksClusterBuilder;
  withDataSecurityMode: (
    mode: string,
  ) => SatisfiedAwsDatabricksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AwsDatabricksClusterBuilder = {
  withId: (id: string) => AwsDatabricksClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsDatabricksClusterBuilder;
  withDisplayName: (displayName: string) => AwsDatabricksClusterBuilder;
  withDescription: (description: string) => AwsDatabricksClusterBuilder;
  withClusterName: (name: string) => AwsDatabricksClusterBuilder;
  withSparkVersion: (version: string) => AwsDatabricksClusterBuilder;
  withNodeTypeId: (nodeTypeId: string) => AwsDatabricksClusterBuilder;
  withNumWorkers: (num: number) => AwsDatabricksClusterBuilder;
  withMinWorkers: (min: number) => AwsDatabricksClusterBuilder;
  withMaxWorkers: (max: number) => AwsDatabricksClusterBuilder;
  withSparkConf: (conf: Record<string, string>) => AwsDatabricksClusterBuilder;
  withPypiLibraries: (libs: string[]) => AwsDatabricksClusterBuilder;
  withMavenLibraries: (libs: string[]) => AwsDatabricksClusterBuilder;
  withAutoTerminationMinutes: (minutes: number) => AwsDatabricksClusterBuilder;
  withDataSecurityMode: (mode: string) => AwsDatabricksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AwsDatabricksClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  clusterName?: string;
  sparkVersion?: string;
  nodeTypeId?: string;
  numWorkers?: number;
  minWorkers?: number;
  maxWorkers?: number;
  sparkConf?: Record<string, string>;
  pypiLibraries?: string[];
  mavenLibraries?: string[];
  autoTerminationMinutes?: number;
  dataSecurityMode?: string;
};

export namespace AwsDatabricksCluster {
  export const getBuilder = (): AwsDatabricksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksClusterType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsDatabricksClusterBuilder = {
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
      withNodeTypeId: nodeTypeId => {
        pushParam(params, NODE_TYPE_ID_PARAM, nodeTypeId);
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
      withDataSecurityMode: mode => {
        pushParam(params, DATA_SECURITY_MODE_PARAM, mode);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsDatabricksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksClusterType())
      .withParameters(params)
      .withProvider('AWS')
      .withId(buildId(blueprint.id.toString()))
      .withVersion(
        buildVersion(
          blueprint.version.major,
          blueprint.version.minor,
          blueprint.version.patch,
        ),
      )
      .withDisplayName(blueprint.displayName)
      .withDependencies(blueprint.dependencies)
      .withLinks(blueprint.links);

    if (blueprint.description) inner.withDescription(blueprint.description);

    // Carry all blueprint params
    const paramKeys = [
      CLUSTER_NAME_PARAM,
      SPARK_VERSION_PARAM,
      NUM_WORKERS_PARAM,
      MIN_WORKERS_PARAM,
      MAX_WORKERS_PARAM,
      SPARK_CONF_PARAM,
      PYPI_LIBRARIES_PARAM,
      MAVEN_LIBRARIES_PARAM,
      AUTO_TERMINATION_MINUTES_PARAM,
    ];
    for (const key of paramKeys) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) pushParam(params, key, val);
    }

    const satisfiedBuilder: SatisfiedAwsDatabricksClusterBuilder = {
      withNodeTypeId: nodeTypeId => {
        pushParam(params, NODE_TYPE_ID_PARAM, nodeTypeId);
        return satisfiedBuilder;
      },
      withDataSecurityMode: mode => {
        pushParam(params, DATA_SECURITY_MODE_PARAM, mode);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AwsDatabricksClusterConfig,
  ): LiveSystemComponent => {
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
    if (config.nodeTypeId) b.withNodeTypeId(config.nodeTypeId);
    if (config.numWorkers !== undefined) b.withNumWorkers(config.numWorkers);
    if (config.minWorkers !== undefined) b.withMinWorkers(config.minWorkers);
    if (config.maxWorkers !== undefined) b.withMaxWorkers(config.maxWorkers);
    if (config.sparkConf) b.withSparkConf(config.sparkConf);
    if (config.pypiLibraries) b.withPypiLibraries(config.pypiLibraries);
    if (config.mavenLibraries) b.withMavenLibraries(config.mavenLibraries);
    if (config.autoTerminationMinutes !== undefined)
      b.withAutoTerminationMinutes(config.autoTerminationMinutes);
    if (config.dataSecurityMode)
      b.withDataSecurityMode(config.dataSecurityMode);

    return b.build();
  };
}
