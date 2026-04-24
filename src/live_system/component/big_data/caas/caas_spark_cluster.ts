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

const CAAS_SPARK_CLUSTER_TYPE_NAME = 'SparkCluster';
const DRIVER_CORES_PARAM = 'driverCores';
const DRIVER_MEMORY_PARAM = 'driverMemory';
const EXECUTOR_CORES_PARAM = 'executorCores';
const EXECUTOR_MEMORY_PARAM = 'executorMemory';
const EXECUTOR_INSTANCES_PARAM = 'executorInstances';

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

function buildType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CAAS_SPARK_CLUSTER_TYPE_NAME)
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

export type SatisfiedCaaSSparkClusterBuilder = {
  withDriverCores: (cores: string) => SatisfiedCaaSSparkClusterBuilder;
  withDriverMemory: (memory: string) => SatisfiedCaaSSparkClusterBuilder;
  withExecutorCores: (cores: string) => SatisfiedCaaSSparkClusterBuilder;
  withExecutorMemory: (memory: string) => SatisfiedCaaSSparkClusterBuilder;
  withExecutorInstances: (count: number) => SatisfiedCaaSSparkClusterBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSSparkClusterBuilder = {
  withId: (id: string) => CaaSSparkClusterBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSSparkClusterBuilder;
  withDisplayName: (displayName: string) => CaaSSparkClusterBuilder;
  withDescription: (description: string) => CaaSSparkClusterBuilder;
  withDriverCores: (cores: string) => CaaSSparkClusterBuilder;
  withDriverMemory: (memory: string) => CaaSSparkClusterBuilder;
  withExecutorCores: (cores: string) => CaaSSparkClusterBuilder;
  withExecutorMemory: (memory: string) => CaaSSparkClusterBuilder;
  withExecutorInstances: (count: number) => CaaSSparkClusterBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSSparkClusterConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  driverCores?: string;
  driverMemory?: string;
  executorCores?: string;
  executorMemory?: string;
  executorInstances?: number;
};

export namespace CaaSSparkCluster {
  export const getBuilder = (): CaaSSparkClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: CaaSSparkClusterBuilder = {
      withId: id => {
        inner.withId(buildId(id));
        return builder;
      },
      withVersion: (major, minor, patch) => {
        inner.withVersion(buildVersion(major, minor, patch));
        return builder;
      },
      withDisplayName: dn => {
        inner.withDisplayName(dn);
        return builder;
      },
      withDescription: d => {
        inner.withDescription(d);
        return builder;
      },
      withDriverCores: v => {
        pushParam(params, DRIVER_CORES_PARAM, v);
        return builder;
      },
      withDriverMemory: v => {
        pushParam(params, DRIVER_MEMORY_PARAM, v);
        return builder;
      },
      withExecutorCores: v => {
        pushParam(params, EXECUTOR_CORES_PARAM, v);
        return builder;
      },
      withExecutorMemory: v => {
        pushParam(params, EXECUTOR_MEMORY_PARAM, v);
        return builder;
      },
      withExecutorInstances: v => {
        pushParam(params, EXECUTOR_INSTANCES_PARAM, v);
        return builder;
      },
      build: () => inner.build(),
    };
    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedCaaSSparkClusterBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS')
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

    if (blueprint.description) {
      inner.withDescription(blueprint.description);
    }

    const satisfiedBuilder: SatisfiedCaaSSparkClusterBuilder = {
      withDriverCores: v => {
        pushParam(params, DRIVER_CORES_PARAM, v);
        return satisfiedBuilder;
      },
      withDriverMemory: v => {
        pushParam(params, DRIVER_MEMORY_PARAM, v);
        return satisfiedBuilder;
      },
      withExecutorCores: v => {
        pushParam(params, EXECUTOR_CORES_PARAM, v);
        return satisfiedBuilder;
      },
      withExecutorMemory: v => {
        pushParam(params, EXECUTOR_MEMORY_PARAM, v);
        return satisfiedBuilder;
      },
      withExecutorInstances: v => {
        pushParam(params, EXECUTOR_INSTANCES_PARAM, v);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };
    return satisfiedBuilder;
  };

  export const create = (
    config: CaaSSparkClusterConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);
    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.driverCores) {
      b.withDriverCores(config.driverCores);
    }
    if (config.driverMemory) {
      b.withDriverMemory(config.driverMemory);
    }
    if (config.executorCores) {
      b.withExecutorCores(config.executorCores);
    }
    if (config.executorMemory) {
      b.withExecutorMemory(config.executorMemory);
    }
    if (config.executorInstances !== undefined) {
      b.withExecutorInstances(config.executorInstances);
    }
    return b.build();
  };
}
