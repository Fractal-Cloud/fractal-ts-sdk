import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
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
const DATABRICKS_CLUSTER_TYPE_NAME = 'DatabricksCluster';

// -- internal helpers ----------------------------------------------------------

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

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(DATABRICKS_CLUSTER_TYPE_NAME)
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

// -- Public API ----------------------------------------------------------------

/**
 * Returned by satisfy() — no vendor-specific parameters needed for a
 * GCP Databricks Cluster. All parameters are carried from the blueprint.
 */
export type SatisfiedGcpDatabricksClusterBuilder = {
  withNodeTypeId: (nodeTypeId: string) => SatisfiedGcpDatabricksClusterBuilder;
  withDataSecurityMode: (
    mode: string,
  ) => SatisfiedGcpDatabricksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type GcpDatabricksClusterBuilder = {
  withId: (id: string) => GcpDatabricksClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpDatabricksClusterBuilder;
  withDisplayName: (displayName: string) => GcpDatabricksClusterBuilder;
  withDescription: (description: string) => GcpDatabricksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type GcpDatabricksClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace GcpDatabricksCluster {
  export const getBuilder = (): GcpDatabricksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpDatabricksClusterBuilder = {
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

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpDatabricksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP')
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

    const satisfiedBuilder: SatisfiedGcpDatabricksClusterBuilder = {
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
    config: GcpDatabricksClusterConfig,
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

    return b.build();
  };
}
