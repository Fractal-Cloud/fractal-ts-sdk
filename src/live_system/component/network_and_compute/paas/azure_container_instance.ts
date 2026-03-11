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
} from '../../../../fractal/component/custom_workloads/caas/workload';

// Agent constant: AZURE_CONTAINER_INSTANCE_COMPONENT_NAME = "AzureContainerInstance"
const AZURE_CONTAINER_INSTANCE_TYPE_NAME = 'AzureContainerInstance';

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

function buildAzureContainerInstanceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_CONTAINER_INSTANCE_TYPE_NAME)
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

export type SatisfiedAzureContainerInstanceBuilder = {
  withLocation: (location: string) => SatisfiedAzureContainerInstanceBuilder;
  withResourceGroup: (
    resourceGroup: string,
  ) => SatisfiedAzureContainerInstanceBuilder;
  withCpu: (cpu: number) => SatisfiedAzureContainerInstanceBuilder;
  withMemoryInGb: (
    memoryInGb: number,
  ) => SatisfiedAzureContainerInstanceBuilder;
  withRestartPolicy: (policy: string) => SatisfiedAzureContainerInstanceBuilder;
  withPublicIp: (publicIp: boolean) => SatisfiedAzureContainerInstanceBuilder;
  withDnsNameLabel: (label: string) => SatisfiedAzureContainerInstanceBuilder;
  build: () => LiveSystemComponent;
};

export type AzureContainerInstanceBuilder = {
  withId: (id: string) => AzureContainerInstanceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureContainerInstanceBuilder;
  withDisplayName: (displayName: string) => AzureContainerInstanceBuilder;
  withDescription: (description: string) => AzureContainerInstanceBuilder;
  withImage: (image: string) => AzureContainerInstanceBuilder;
  withPort: (port: number) => AzureContainerInstanceBuilder;
  withLocation: (location: string) => AzureContainerInstanceBuilder;
  withResourceGroup: (resourceGroup: string) => AzureContainerInstanceBuilder;
  withCpu: (cpu: number) => AzureContainerInstanceBuilder;
  withMemoryInGb: (memoryInGb: number) => AzureContainerInstanceBuilder;
  withRestartPolicy: (policy: string) => AzureContainerInstanceBuilder;
  withPublicIp: (publicIp: boolean) => AzureContainerInstanceBuilder;
  withDnsNameLabel: (label: string) => AzureContainerInstanceBuilder;
  build: () => LiveSystemComponent;
};

export type AzureContainerInstanceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  image: string;
  port?: number;
  location: string;
  resourceGroup: string;
  cpu?: number;
  memoryInGb?: number;
  restartPolicy?: string;
  publicIp?: boolean;
  dnsNameLabel?: string;
};

export namespace AzureContainerInstance {
  export const getBuilder = (): AzureContainerInstanceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureContainerInstanceType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureContainerInstanceBuilder = {
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
      withLocation: location => {
        pushParam(params, 'location', location);
        return builder;
      },
      withResourceGroup: resourceGroup => {
        pushParam(params, 'resourceGroup', resourceGroup);
        return builder;
      },
      withCpu: cpu => {
        pushParam(params, 'cpu', cpu);
        return builder;
      },
      withMemoryInGb: memoryInGb => {
        pushParam(params, 'memoryInGB', memoryInGb);
        return builder;
      },
      withRestartPolicy: policy => {
        pushParam(params, 'restartPolicy', policy);
        return builder;
      },
      withPublicIp: publicIp => {
        pushParam(params, 'publicIp', publicIp);
        return builder;
      },
      withDnsNameLabel: label => {
        pushParam(params, 'dnsNameLabel', label);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Workload component as an Azure Container Instance.
   * Carries id, version, displayName, description, dependencies, links, and
   * container image/port from the blueprint. Location and resourceGroup are
   * Azure-specific and required — add them via withLocation/withResourceGroup.
   *
   * Note: the container image is immutable after creation — drift on the image
   * triggers delete + recreate.
   */
  export const satisfy = (
    workload: BlueprintComponent,
  ): SatisfiedAzureContainerInstanceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureContainerInstanceType())
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

    const satisfiedBuilder: SatisfiedAzureContainerInstanceBuilder = {
      withLocation: location => {
        pushParam(params, 'location', location);
        return satisfiedBuilder;
      },
      withResourceGroup: resourceGroup => {
        pushParam(params, 'resourceGroup', resourceGroup);
        return satisfiedBuilder;
      },
      withCpu: cpu => {
        pushParam(params, 'cpu', cpu);
        return satisfiedBuilder;
      },
      withMemoryInGb: memoryInGb => {
        pushParam(params, 'memoryInGB', memoryInGb);
        return satisfiedBuilder;
      },
      withRestartPolicy: policy => {
        pushParam(params, 'restartPolicy', policy);
        return satisfiedBuilder;
      },
      withPublicIp: publicIp => {
        pushParam(params, 'publicIp', publicIp);
        return satisfiedBuilder;
      },
      withDnsNameLabel: label => {
        pushParam(params, 'dnsNameLabel', label);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureContainerInstanceConfig,
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
    if (config.memoryInGb !== undefined) b.withMemoryInGb(config.memoryInGb);
    if (config.restartPolicy) b.withRestartPolicy(config.restartPolicy);
    if (config.publicIp !== undefined) b.withPublicIp(config.publicIp);
    if (config.dnsNameLabel) b.withDnsNameLabel(config.dnsNameLabel);

    return b.build();
  };
}
