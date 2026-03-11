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
  CPU_PARAM,
  MEMORY_PARAM,
} from '../../../../fractal/component/custom_workloads/caas/workload';

// Agent constant: AZURE_CONTAINER_APP_COMPONENT_NAME = "AzureContainerApp"
const AZURE_CONTAINER_APP_TYPE_NAME = 'AzureContainerApp';

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

function buildAzureContainerAppType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_CONTAINER_APP_TYPE_NAME)
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

export type SatisfiedAzureContainerAppBuilder = {
  withLocation: (location: string) => SatisfiedAzureContainerAppBuilder;
  withResourceGroup: (
    resourceGroup: string,
  ) => SatisfiedAzureContainerAppBuilder;
  withExternalIngress: (external: boolean) => SatisfiedAzureContainerAppBuilder;
  withMinReplicas: (min: number) => SatisfiedAzureContainerAppBuilder;
  withMaxReplicas: (max: number) => SatisfiedAzureContainerAppBuilder;
  build: () => LiveSystemComponent;
};

export type AzureContainerAppBuilder = {
  withId: (id: string) => AzureContainerAppBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureContainerAppBuilder;
  withDisplayName: (displayName: string) => AzureContainerAppBuilder;
  withDescription: (description: string) => AzureContainerAppBuilder;
  withImage: (image: string) => AzureContainerAppBuilder;
  withPort: (port: number) => AzureContainerAppBuilder;
  withCpu: (cpu: number) => AzureContainerAppBuilder;
  withMemory: (memory: string) => AzureContainerAppBuilder;
  withLocation: (location: string) => AzureContainerAppBuilder;
  withResourceGroup: (resourceGroup: string) => AzureContainerAppBuilder;
  withExternalIngress: (external: boolean) => AzureContainerAppBuilder;
  withMinReplicas: (min: number) => AzureContainerAppBuilder;
  withMaxReplicas: (max: number) => AzureContainerAppBuilder;
  build: () => LiveSystemComponent;
};

export type AzureContainerAppConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  image: string;
  port?: number;
  cpu?: number;
  memory?: string;
  location: string;
  resourceGroup: string;
  externalIngress?: boolean;
  minReplicas?: number;
  maxReplicas?: number;
};

export namespace AzureContainerApp {
  export const getBuilder = (): AzureContainerAppBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureContainerAppType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureContainerAppBuilder = {
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
      withImage: image => {
        pushParam(params, 'image', image);
        return builder;
      },
      withPort: port => {
        pushParam(params, 'port', port);
        return builder;
      },
      withCpu: cpu => {
        pushParam(params, 'cpu', cpu);
        return builder;
      },
      withMemory: memory => {
        pushParam(params, 'memory', memory);
        return builder;
      },
      withLocation: location => {
        pushParam(params, 'location', location);
        return builder;
      },
      withResourceGroup: resourceGroup => {
        pushParam(params, 'resourceGroup', resourceGroup);
        return builder;
      },
      withExternalIngress: external => {
        pushParam(params, 'externalIngress', external);
        return builder;
      },
      withMinReplicas: min => {
        pushParam(params, 'minReplicas', min);
        return builder;
      },
      withMaxReplicas: max => {
        pushParam(params, 'maxReplicas', max);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Workload component as an Azure Container App.
   * Carries id, version, displayName, description, dependencies (including
   * the AzureContainerAppsEnvironment dep auto-wired via ContainerPlatform),
   * links, container image, port, cpu, and memory from the blueprint.
   * Location and resourceGroup are Azure-specific and required.
   */
  export const satisfy = (
    workload: BlueprintComponent,
  ): SatisfiedAzureContainerAppBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureContainerAppType())
      .withParameters(params)
      .withProvider('Azure')
      .withId(buildId(workload.id.toString()))
      .withVersion(
        buildVersion(
          workload.version.major,
          workload.version.minor,
          workload.version.patch,
        ),
      )
      .withDisplayName(workload.displayName)
      .withDependencies(workload.dependencies)
      .withLinks(workload.links);

    if (workload.description) inner.withDescription(workload.description);

    // Blueprint containerImage → agent 'image' key
    const image = workload.parameters.getOptionalFieldByName(
      CONTAINER_IMAGE_PARAM,
    );
    if (image !== null) pushParam(params, 'image', image);

    // Blueprint containerPort → agent 'port' key
    const port =
      workload.parameters.getOptionalFieldByName(CONTAINER_PORT_PARAM);
    if (port !== null) pushParam(params, 'port', port);

    // cpu and memory keys match between blueprint and agent
    const cpu = workload.parameters.getOptionalFieldByName(CPU_PARAM);
    if (cpu !== null) pushParam(params, 'cpu', cpu);

    const memory = workload.parameters.getOptionalFieldByName(MEMORY_PARAM);
    if (memory !== null) pushParam(params, 'memory', memory);

    const satisfiedBuilder: SatisfiedAzureContainerAppBuilder = {
      withLocation: location => {
        pushParam(params, 'location', location);
        return satisfiedBuilder;
      },
      withResourceGroup: resourceGroup => {
        pushParam(params, 'resourceGroup', resourceGroup);
        return satisfiedBuilder;
      },
      withExternalIngress: external => {
        pushParam(params, 'externalIngress', external);
        return satisfiedBuilder;
      },
      withMinReplicas: min => {
        pushParam(params, 'minReplicas', min);
        return satisfiedBuilder;
      },
      withMaxReplicas: max => {
        pushParam(params, 'maxReplicas', max);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureContainerAppConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withImage(config.image)
      .withLocation(config.location)
      .withResourceGroup(config.resourceGroup);

    if (config.description) b.withDescription(config.description);
    if (config.port !== undefined) b.withPort(config.port);
    if (config.cpu !== undefined) b.withCpu(config.cpu);
    if (config.memory) b.withMemory(config.memory);
    if (config.externalIngress !== undefined)
      b.withExternalIngress(config.externalIngress);
    if (config.minReplicas !== undefined) b.withMinReplicas(config.minReplicas);
    if (config.maxReplicas !== undefined) b.withMaxReplicas(config.maxReplicas);

    return b.build();
  };
}
