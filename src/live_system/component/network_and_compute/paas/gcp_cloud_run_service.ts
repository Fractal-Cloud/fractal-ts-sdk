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

// Agent constant: CLOUD_RUN_SERVICE_COMPONENT_NAME = "CloudRunService"
const CLOUD_RUN_SERVICE_TYPE_NAME = 'CloudRunService';

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

function buildGcpCloudRunServiceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CLOUD_RUN_SERVICE_TYPE_NAME)
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

export type SatisfiedGcpCloudRunServiceBuilder = {
  withRegion: (region: string) => SatisfiedGcpCloudRunServiceBuilder;
  withMinInstances: (min: number) => SatisfiedGcpCloudRunServiceBuilder;
  withMaxInstances: (max: number) => SatisfiedGcpCloudRunServiceBuilder;
  withConcurrency: (concurrency: number) => SatisfiedGcpCloudRunServiceBuilder;
  withServiceAccountEmail: (
    email: string,
  ) => SatisfiedGcpCloudRunServiceBuilder;
  withIngress: (ingress: string) => SatisfiedGcpCloudRunServiceBuilder;
  build: () => LiveSystemComponent;
};

export type GcpCloudRunServiceBuilder = {
  withId: (id: string) => GcpCloudRunServiceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpCloudRunServiceBuilder;
  withDisplayName: (displayName: string) => GcpCloudRunServiceBuilder;
  withDescription: (description: string) => GcpCloudRunServiceBuilder;
  withImage: (image: string) => GcpCloudRunServiceBuilder;
  withPort: (port: number) => GcpCloudRunServiceBuilder;
  withCpu: (cpu: string) => GcpCloudRunServiceBuilder;
  withMemory: (memory: string) => GcpCloudRunServiceBuilder;
  withRegion: (region: string) => GcpCloudRunServiceBuilder;
  withMinInstances: (min: number) => GcpCloudRunServiceBuilder;
  withMaxInstances: (max: number) => GcpCloudRunServiceBuilder;
  withConcurrency: (concurrency: number) => GcpCloudRunServiceBuilder;
  withServiceAccountEmail: (email: string) => GcpCloudRunServiceBuilder;
  withIngress: (ingress: string) => GcpCloudRunServiceBuilder;
  build: () => LiveSystemComponent;
};

export type GcpCloudRunServiceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  image: string;
  port?: number;
  cpu?: string;
  memory?: string;
  region: string;
  minInstances?: number;
  maxInstances?: number;
  concurrency?: number;
  serviceAccountEmail?: string;
  ingress?: string;
};

export namespace GcpCloudRunService {
  export const getBuilder = (): GcpCloudRunServiceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpCloudRunServiceType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpCloudRunServiceBuilder = {
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
      withRegion: region => {
        pushParam(params, 'region', region);
        return builder;
      },
      withMinInstances: min => {
        pushParam(params, 'minInstances', min);
        return builder;
      },
      withMaxInstances: max => {
        pushParam(params, 'maxInstances', max);
        return builder;
      },
      withConcurrency: concurrency => {
        pushParam(params, 'concurrency', concurrency);
        return builder;
      },
      withServiceAccountEmail: email => {
        pushParam(params, 'serviceAccountEmail', email);
        return builder;
      },
      withIngress: ingress => {
        pushParam(params, 'ingress', ingress);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Workload component as a GCP Cloud Run Service.
   * Carries id, version, displayName, description, dependencies, links,
   * container image, port, cpu, and memory from the blueprint.
   * Region is GCP-specific and required — add it via withRegion().
   *
   * An optional dependency on a GcpSubnet blueprint component enables
   * Direct VPC egress (declare the dependency in the blueprint).
   */
  export const satisfy = (
    workload: BlueprintComponent,
  ): SatisfiedGcpCloudRunServiceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpCloudRunServiceType())
      .withParameters(params)
      .withProvider('GCP')
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

    const satisfiedBuilder: SatisfiedGcpCloudRunServiceBuilder = {
      withRegion: region => {
        pushParam(params, 'region', region);
        return satisfiedBuilder;
      },
      withMinInstances: min => {
        pushParam(params, 'minInstances', min);
        return satisfiedBuilder;
      },
      withMaxInstances: max => {
        pushParam(params, 'maxInstances', max);
        return satisfiedBuilder;
      },
      withConcurrency: concurrency => {
        pushParam(params, 'concurrency', concurrency);
        return satisfiedBuilder;
      },
      withServiceAccountEmail: email => {
        pushParam(params, 'serviceAccountEmail', email);
        return satisfiedBuilder;
      },
      withIngress: ingress => {
        pushParam(params, 'ingress', ingress);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: GcpCloudRunServiceConfig,
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
      .withRegion(config.region);

    if (config.description) b.withDescription(config.description);
    if (config.port !== undefined) b.withPort(config.port);
    if (config.cpu) b.withCpu(config.cpu);
    if (config.memory) b.withMemory(config.memory);
    if (config.minInstances !== undefined)
      b.withMinInstances(config.minInstances);
    if (config.maxInstances !== undefined)
      b.withMaxInstances(config.maxInstances);
    if (config.concurrency !== undefined) b.withConcurrency(config.concurrency);
    if (config.serviceAccountEmail)
      b.withServiceAccountEmail(config.serviceAccountEmail);
    if (config.ingress) b.withIngress(config.ingress);

    return b.build();
  };
}
