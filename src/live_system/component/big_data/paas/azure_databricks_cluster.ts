import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
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

const AZURE_DATABRICKS_CLUSTER_TYPE_NAME = 'DatabricksCluster';

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

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_DATABRICKS_CLUSTER_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — all cluster params are locked from the blueprint.
 * No Azure-specific parameters are needed, so only build() is exposed.
 */
export type SatisfiedAzureDatabricksClusterBuilder = {
  withNodeTypeId: (
    nodeTypeId: string,
  ) => SatisfiedAzureDatabricksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AzureDatabricksClusterBuilder = {
  withId: (id: string) => AzureDatabricksClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureDatabricksClusterBuilder;
  withDisplayName: (displayName: string) => AzureDatabricksClusterBuilder;
  withDescription: (description: string) => AzureDatabricksClusterBuilder;
  build: () => LiveSystemComponent;
};

export type AzureDatabricksClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace AzureDatabricksCluster {
  export const getBuilder = (): AzureDatabricksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureDatabricksClusterBuilder = {
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

  /**
   * Satisfies a blueprint ComputeCluster component as an Azure Databricks Cluster.
   * Carries id, version, displayName, dependencies, links, and all cluster params.
   */
  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureDatabricksClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure')
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

    // Carry all blueprint cluster params
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
      if (val !== null) params.push(key, val as Record<string, object>);
    }

    const satisfiedBuilder: SatisfiedAzureDatabricksClusterBuilder = {
      withNodeTypeId: nodeTypeId => {
        params.push(
          NODE_TYPE_ID_PARAM,
          nodeTypeId as unknown as Record<string, object>,
        );
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureDatabricksClusterConfig,
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
