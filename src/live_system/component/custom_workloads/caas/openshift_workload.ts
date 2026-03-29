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
  DESIRED_COUNT_PARAM,
} from '../../../../fractal/component/custom_workloads/caas/workload';

// Agent constant: OfferWorkload = "CustomWorkloads.CaaS.OpenshiftWorkload"
const OPENSHIFT_WORKLOAD_TYPE_NAME = 'OpenshiftWorkload';
const IMAGE_PARAM = 'image';
const PORT_PARAM = 'port';
const NAME_PARAM = 'name';
const REPLICAS_PARAM = 'replicas';
const CPU_REQUEST_PARAM = 'cpuRequest';
const MEMORY_REQUEST_PARAM = 'memoryRequest';
const NAMESPACE_PARAM = 'namespace';
const WORKLOAD_TYPE_PARAM = 'workloadType';
const CPU_LIMIT_PARAM = 'cpuLimit';
const MEMORY_LIMIT_PARAM = 'memoryLimit';
const PROTOCOL_PARAM = 'protocol';
const ENV_VARS_PARAM = 'envVars';
const SERVICE_ACCOUNT_NAME_PARAM = 'serviceAccountName';
const COMMAND_PARAM = 'command';
const ARGS_PARAM = 'args';
const VOLUME_MOUNTS_PARAM = 'volumeMounts';

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

function buildOpenshiftWorkloadType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OPENSHIFT_WORKLOAD_TYPE_NAME)
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
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedOpenshiftWorkloadBuilder = {
  withNamespace: (namespace: string) => SatisfiedOpenshiftWorkloadBuilder;
  withWorkloadType: (workloadType: string) => SatisfiedOpenshiftWorkloadBuilder;
  withCpuLimit: (cpuLimit: string) => SatisfiedOpenshiftWorkloadBuilder;
  withMemoryLimit: (memoryLimit: string) => SatisfiedOpenshiftWorkloadBuilder;
  withProtocol: (protocol: string) => SatisfiedOpenshiftWorkloadBuilder;
  withEnvVars: (envVars: string) => SatisfiedOpenshiftWorkloadBuilder;
  withServiceAccountName: (name: string) => SatisfiedOpenshiftWorkloadBuilder;
  withCommand: (command: string) => SatisfiedOpenshiftWorkloadBuilder;
  withArgs: (args: string) => SatisfiedOpenshiftWorkloadBuilder;
  withVolumeMounts: (volumeMounts: string) => SatisfiedOpenshiftWorkloadBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftWorkloadBuilder = {
  withId: (id: string) => OpenshiftWorkloadBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OpenshiftWorkloadBuilder;
  withDisplayName: (displayName: string) => OpenshiftWorkloadBuilder;
  withDescription: (description: string) => OpenshiftWorkloadBuilder;
  withImage: (image: string) => OpenshiftWorkloadBuilder;
  withPort: (port: number) => OpenshiftWorkloadBuilder;
  withName: (name: string) => OpenshiftWorkloadBuilder;
  withReplicas: (replicas: number) => OpenshiftWorkloadBuilder;
  withNamespace: (namespace: string) => OpenshiftWorkloadBuilder;
  withWorkloadType: (workloadType: string) => OpenshiftWorkloadBuilder;
  withCpuRequest: (cpuRequest: string) => OpenshiftWorkloadBuilder;
  withCpuLimit: (cpuLimit: string) => OpenshiftWorkloadBuilder;
  withMemoryRequest: (memoryRequest: string) => OpenshiftWorkloadBuilder;
  withMemoryLimit: (memoryLimit: string) => OpenshiftWorkloadBuilder;
  withProtocol: (protocol: string) => OpenshiftWorkloadBuilder;
  withEnvVars: (envVars: string) => OpenshiftWorkloadBuilder;
  withServiceAccountName: (name: string) => OpenshiftWorkloadBuilder;
  withCommand: (command: string) => OpenshiftWorkloadBuilder;
  withArgs: (args: string) => OpenshiftWorkloadBuilder;
  withVolumeMounts: (volumeMounts: string) => OpenshiftWorkloadBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftWorkloadConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  image: string;
  port?: number;
  name?: string;
  replicas?: number;
  namespace?: string;
  workloadType?: string;
  cpuRequest?: string;
  cpuLimit?: string;
  memoryRequest?: string;
  memoryLimit?: string;
  protocol?: string;
  envVars?: string;
  serviceAccountName?: string;
  command?: string;
  args?: string;
  volumeMounts?: string;
};

export namespace OpenshiftWorkload {
  export const getBuilder = (): OpenshiftWorkloadBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftWorkloadType())
      .withParameters(params)
      .withProvider('RedHat');

    const builder: OpenshiftWorkloadBuilder = {
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
      withImage: value => {
        pushParam(params, IMAGE_PARAM, value);
        return builder;
      },
      withPort: value => {
        pushParam(params, PORT_PARAM, value);
        return builder;
      },
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return builder;
      },
      withReplicas: value => {
        pushParam(params, REPLICAS_PARAM, value);
        return builder;
      },
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return builder;
      },
      withWorkloadType: value => {
        pushParam(params, WORKLOAD_TYPE_PARAM, value);
        return builder;
      },
      withCpuRequest: value => {
        pushParam(params, CPU_REQUEST_PARAM, value);
        return builder;
      },
      withCpuLimit: value => {
        pushParam(params, CPU_LIMIT_PARAM, value);
        return builder;
      },
      withMemoryRequest: value => {
        pushParam(params, MEMORY_REQUEST_PARAM, value);
        return builder;
      },
      withMemoryLimit: value => {
        pushParam(params, MEMORY_LIMIT_PARAM, value);
        return builder;
      },
      withProtocol: value => {
        pushParam(params, PROTOCOL_PARAM, value);
        return builder;
      },
      withEnvVars: value => {
        pushParam(params, ENV_VARS_PARAM, value);
        return builder;
      },
      withServiceAccountName: value => {
        pushParam(params, SERVICE_ACCOUNT_NAME_PARAM, value);
        return builder;
      },
      withCommand: value => {
        pushParam(params, COMMAND_PARAM, value);
        return builder;
      },
      withArgs: value => {
        pushParam(params, ARGS_PARAM, value);
        return builder;
      },
      withVolumeMounts: value => {
        pushParam(params, VOLUME_MOUNTS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Workload component as an OpenShift Workload.
   * Blueprint params are mapped to offer-specific param keys:
   * containerImage → image, containerPort → port, containerName → name,
   * cpu → cpuRequest, memory → memoryRequest, desiredCount → replicas.
   */
  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOpenshiftWorkloadBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftWorkloadType())
      .withParameters(params)
      .withProvider('RedHat')
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

    // Carry blueprint params with mapped keys
    const image = blueprint.parameters.getOptionalFieldByName(
      CONTAINER_IMAGE_PARAM,
    );
    if (image !== null) pushParam(params, IMAGE_PARAM, image);

    const port =
      blueprint.parameters.getOptionalFieldByName(CONTAINER_PORT_PARAM);
    if (port !== null) pushParam(params, PORT_PARAM, port);

    const name =
      blueprint.parameters.getOptionalFieldByName(CONTAINER_NAME_PARAM);
    if (name !== null) pushParam(params, NAME_PARAM, name);

    const cpu = blueprint.parameters.getOptionalFieldByName(CPU_PARAM);
    if (cpu !== null) pushParam(params, CPU_REQUEST_PARAM, cpu);

    const memory = blueprint.parameters.getOptionalFieldByName(MEMORY_PARAM);
    if (memory !== null) pushParam(params, MEMORY_REQUEST_PARAM, memory);

    const replicas =
      blueprint.parameters.getOptionalFieldByName(DESIRED_COUNT_PARAM);
    if (replicas !== null) pushParam(params, REPLICAS_PARAM, replicas);

    const satisfiedBuilder: SatisfiedOpenshiftWorkloadBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withWorkloadType: value => {
        pushParam(params, WORKLOAD_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withCpuLimit: value => {
        pushParam(params, CPU_LIMIT_PARAM, value);
        return satisfiedBuilder;
      },
      withMemoryLimit: value => {
        pushParam(params, MEMORY_LIMIT_PARAM, value);
        return satisfiedBuilder;
      },
      withProtocol: value => {
        pushParam(params, PROTOCOL_PARAM, value);
        return satisfiedBuilder;
      },
      withEnvVars: value => {
        pushParam(params, ENV_VARS_PARAM, value);
        return satisfiedBuilder;
      },
      withServiceAccountName: value => {
        pushParam(params, SERVICE_ACCOUNT_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withCommand: value => {
        pushParam(params, COMMAND_PARAM, value);
        return satisfiedBuilder;
      },
      withArgs: value => {
        pushParam(params, ARGS_PARAM, value);
        return satisfiedBuilder;
      },
      withVolumeMounts: value => {
        pushParam(params, VOLUME_MOUNTS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: OpenshiftWorkloadConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withImage(config.image);

    if (config.description) b.withDescription(config.description);
    if (config.port !== undefined) b.withPort(config.port);
    if (config.name) b.withName(config.name);
    if (config.replicas !== undefined) b.withReplicas(config.replicas);
    if (config.namespace) b.withNamespace(config.namespace);
    if (config.workloadType) b.withWorkloadType(config.workloadType);
    if (config.cpuRequest) b.withCpuRequest(config.cpuRequest);
    if (config.cpuLimit) b.withCpuLimit(config.cpuLimit);
    if (config.memoryRequest) b.withMemoryRequest(config.memoryRequest);
    if (config.memoryLimit) b.withMemoryLimit(config.memoryLimit);
    if (config.protocol) b.withProtocol(config.protocol);
    if (config.envVars) b.withEnvVars(config.envVars);
    if (config.serviceAccountName)
      b.withServiceAccountName(config.serviceAccountName);
    if (config.command) b.withCommand(config.command);
    if (config.args) b.withArgs(config.args);
    if (config.volumeMounts) b.withVolumeMounts(config.volumeMounts);

    return b.build();
  };
}
