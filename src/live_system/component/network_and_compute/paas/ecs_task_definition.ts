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
  CONTAINER_IMAGE_PARAM,
  CONTAINER_PORT_PARAM,
  CONTAINER_NAME_PARAM,
  CPU_PARAM,
  MEMORY_PARAM,
} from '../../../../fractal/component/custom_workloads/caas/workload';

// Agent constant: ECS_TASK_DEF_COMPONENT_NAME = "ECSTaskDefinition"
const ECS_TASK_DEF_TYPE_NAME = 'ECSTaskDefinition';
const NETWORK_MODE_PARAM = 'networkMode';
const EXECUTION_ROLE_ARN_PARAM = 'executionRoleArn';
const TASK_ROLE_ARN_PARAM = 'taskRoleArn';

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

function buildAwsEcsTaskDefType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ECS_TASK_DEF_TYPE_NAME).build(),
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
 * Branded live-system component produced by AwsEcsTaskDefinition builders.
 * The brand prevents passing an arbitrary LiveSystemComponent to
 * AwsEcsService.withTaskDefinition() — only a value produced by
 * AwsEcsTaskDefinition.satisfy() or AwsEcsTaskDefinition.create() is accepted.
 */
export type AwsEcsTaskDefinitionComponent = LiveSystemComponent & {
  readonly _brand: 'AwsEcsTaskDefinition';
};

/**
 * Returned by satisfy() — blueprint params (image, port, cpu, memory) are
 * locked. Only IAM role ARNs and network mode can be added here.
 *
 * The component ID is derived as `${workload.id}-task` to avoid collision
 * with the AwsEcsService component that satisfies the same blueprint workload.
 */
export type SatisfiedAwsEcsTaskDefinitionBuilder = {
  withNetworkMode: (mode: string) => SatisfiedAwsEcsTaskDefinitionBuilder;
  withExecutionRoleArn: (arn: string) => SatisfiedAwsEcsTaskDefinitionBuilder;
  withTaskRoleArn: (arn: string) => SatisfiedAwsEcsTaskDefinitionBuilder;
  build: () => AwsEcsTaskDefinitionComponent;
};

export type AwsEcsTaskDefinitionBuilder = {
  withId: (id: string) => AwsEcsTaskDefinitionBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsEcsTaskDefinitionBuilder;
  withDisplayName: (displayName: string) => AwsEcsTaskDefinitionBuilder;
  withDescription: (description: string) => AwsEcsTaskDefinitionBuilder;
  withContainerImage: (image: string) => AwsEcsTaskDefinitionBuilder;
  withContainerPort: (port: number) => AwsEcsTaskDefinitionBuilder;
  withContainerName: (name: string) => AwsEcsTaskDefinitionBuilder;
  withCpu: (cpu: string) => AwsEcsTaskDefinitionBuilder;
  withMemory: (memory: string) => AwsEcsTaskDefinitionBuilder;
  withNetworkMode: (mode: string) => AwsEcsTaskDefinitionBuilder;
  withExecutionRoleArn: (arn: string) => AwsEcsTaskDefinitionBuilder;
  withTaskRoleArn: (arn: string) => AwsEcsTaskDefinitionBuilder;
  build: () => AwsEcsTaskDefinitionComponent;
};

export type AwsEcsTaskDefinitionConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  containerImage: string;
  containerPort?: number;
  containerName?: string;
  cpu?: string;
  memory?: string;
  networkMode?: string;
  executionRoleArn?: string;
  taskRoleArn?: string;
};

export namespace AwsEcsTaskDefinition {
  export const getBuilder = (): AwsEcsTaskDefinitionBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEcsTaskDefType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsEcsTaskDefinitionBuilder = {
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
      withContainerImage: image => {
        pushParam(params, CONTAINER_IMAGE_PARAM, image);
        return builder;
      },
      withContainerPort: port => {
        pushParam(params, CONTAINER_PORT_PARAM, port);
        return builder;
      },
      withContainerName: name => {
        pushParam(params, CONTAINER_NAME_PARAM, name);
        return builder;
      },
      withCpu: cpu => {
        pushParam(params, CPU_PARAM, cpu);
        return builder;
      },
      withMemory: memory => {
        pushParam(params, MEMORY_PARAM, memory);
        return builder;
      },
      withNetworkMode: mode => {
        pushParam(params, NETWORK_MODE_PARAM, mode);
        return builder;
      },
      withExecutionRoleArn: arn => {
        pushParam(params, EXECUTION_ROLE_ARN_PARAM, arn);
        return builder;
      },
      withTaskRoleArn: arn => {
        pushParam(params, TASK_ROLE_ARN_PARAM, arn);
        return builder;
      },
      build: () => inner.build() as AwsEcsTaskDefinitionComponent,
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Workload component as an AWS ECS Task Definition.
   * The component ID is `${workload.id}-task` to avoid collision with the
   * AwsEcsService that satisfies the same workload.
   */
  export const satisfy = (
    workload: BlueprintComponent,
  ): SatisfiedAwsEcsTaskDefinitionBuilder => {
    const params = getParametersInstance();
    const taskId = `${workload.id.toString()}-task`;
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEcsTaskDefType())
      .withParameters(params)
      .withProvider('AWS')
      .withId(buildId(taskId))
      .withVersion(
        buildVersion(
          workload.version.major,
          workload.version.minor,
          workload.version.patch,
        ),
      )
      .withDisplayName(workload.displayName);

    if (workload.description) inner.withDescription(workload.description);

    // Carry workload params that define what the container runs
    for (const key of [
      CONTAINER_IMAGE_PARAM,
      CONTAINER_PORT_PARAM,
      CONTAINER_NAME_PARAM,
      CPU_PARAM,
      MEMORY_PARAM,
    ]) {
      const v = workload.parameters.getOptionalFieldByName(key);
      if (v !== null) pushParam(params, key, v);
    }

    const satisfiedBuilder: SatisfiedAwsEcsTaskDefinitionBuilder = {
      withNetworkMode: mode => {
        pushParam(params, NETWORK_MODE_PARAM, mode);
        return satisfiedBuilder;
      },
      withExecutionRoleArn: arn => {
        pushParam(params, EXECUTION_ROLE_ARN_PARAM, arn);
        return satisfiedBuilder;
      },
      withTaskRoleArn: arn => {
        pushParam(params, TASK_ROLE_ARN_PARAM, arn);
        return satisfiedBuilder;
      },
      build: () => inner.build() as AwsEcsTaskDefinitionComponent,
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AwsEcsTaskDefinitionConfig,
  ): AwsEcsTaskDefinitionComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withContainerImage(config.containerImage);

    if (config.description) b.withDescription(config.description);
    if (config.containerPort !== undefined)
      b.withContainerPort(config.containerPort);
    if (config.containerName) b.withContainerName(config.containerName);
    if (config.cpu) b.withCpu(config.cpu);
    if (config.memory) b.withMemory(config.memory);
    if (config.networkMode) b.withNetworkMode(config.networkMode);
    if (config.executionRoleArn)
      b.withExecutionRoleArn(config.executionRoleArn);
    if (config.taskRoleArn) b.withTaskRoleArn(config.taskRoleArn);

    return b.build() as AwsEcsTaskDefinitionComponent;
  };
}
