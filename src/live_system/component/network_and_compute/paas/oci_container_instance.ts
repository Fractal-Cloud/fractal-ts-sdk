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
import {CONTAINER_IMAGE_PARAM} from '../../../../fractal/component/custom_workloads/caas/workload';

// Agent constant: OCI_CONTAINER_INSTANCE_COMPONENT_NAME = "OciContainerInstance"
const OCI_CONTAINER_INSTANCE_TYPE_NAME = 'OciContainerInstance';

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

function buildOciContainerInstanceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OCI_CONTAINER_INSTANCE_TYPE_NAME)
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

export type SatisfiedOciContainerInstanceBuilder = {
  withAvailabilityDomain: (
    domain: string,
  ) => SatisfiedOciContainerInstanceBuilder;
  withCompartmentId: (
    compartmentId: string,
  ) => SatisfiedOciContainerInstanceBuilder;
  withOcpus: (ocpus: number) => SatisfiedOciContainerInstanceBuilder;
  withMemoryInGbs: (
    memoryInGbs: number,
  ) => SatisfiedOciContainerInstanceBuilder;
  withShape: (shape: string) => SatisfiedOciContainerInstanceBuilder;
  withAssignPublicIp: (
    assignPublicIp: boolean,
  ) => SatisfiedOciContainerInstanceBuilder;
  withContainerRestartPolicy: (
    policy: string,
  ) => SatisfiedOciContainerInstanceBuilder;
  build: () => LiveSystemComponent;
};

export type OciContainerInstanceBuilder = {
  withId: (id: string) => OciContainerInstanceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OciContainerInstanceBuilder;
  withDisplayName: (displayName: string) => OciContainerInstanceBuilder;
  withDescription: (description: string) => OciContainerInstanceBuilder;
  withImageUrl: (imageUrl: string) => OciContainerInstanceBuilder;
  withAvailabilityDomain: (domain: string) => OciContainerInstanceBuilder;
  withCompartmentId: (compartmentId: string) => OciContainerInstanceBuilder;
  withOcpus: (ocpus: number) => OciContainerInstanceBuilder;
  withMemoryInGbs: (memoryInGbs: number) => OciContainerInstanceBuilder;
  withShape: (shape: string) => OciContainerInstanceBuilder;
  withPort: (port: number) => OciContainerInstanceBuilder;
  withAssignPublicIp: (assignPublicIp: boolean) => OciContainerInstanceBuilder;
  withContainerRestartPolicy: (policy: string) => OciContainerInstanceBuilder;
  build: () => LiveSystemComponent;
};

export type OciContainerInstanceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  imageUrl: string;
  availabilityDomain: string;
  compartmentId: string;
  ocpus?: number;
  memoryInGbs?: number;
  shape?: string;
  port?: number;
  assignPublicIp?: boolean;
  containerRestartPolicy?: string;
};

export namespace OciContainerInstance {
  export const getBuilder = (): OciContainerInstanceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOciContainerInstanceType())
      .withParameters(params)
      .withProvider('OCI');

    const builder: OciContainerInstanceBuilder = {
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
      withImageUrl: imageUrl => {
        pushParam(params, 'imageUrl', imageUrl);
        return builder;
      },
      withAvailabilityDomain: domain => {
        pushParam(params, 'availabilityDomain', domain);
        return builder;
      },
      withCompartmentId: compartmentId => {
        pushParam(params, 'compartmentId', compartmentId);
        return builder;
      },
      withOcpus: ocpus => {
        pushParam(params, 'ocpus', ocpus);
        return builder;
      },
      withMemoryInGbs: memoryInGbs => {
        pushParam(params, 'memoryInGBs', memoryInGbs);
        return builder;
      },
      withShape: shape => {
        pushParam(params, 'shape', shape);
        return builder;
      },
      withPort: port => {
        pushParam(params, 'port', port);
        return builder;
      },
      withAssignPublicIp: assignPublicIp => {
        pushParam(params, 'assignPublicIp', assignPublicIp);
        return builder;
      },
      withContainerRestartPolicy: policy => {
        pushParam(params, 'containerRestartPolicy', policy);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Workload component as an OCI Container Instance.
   * Carries id, version, displayName, description, dependencies, and links
   * from the blueprint. The blueprint containerImage is re-mapped to the
   * agent's `imageUrl` key.
   *
   * availabilityDomain and compartmentId are OCI-specific and required.
   * The image URL is immutable after creation — drift triggers delete + recreate.
   *
   * Dependencies: must declare a dependency on an OciSubnet component in the
   * blueprint (add it via Subnet.withWorkloads() in fractal.ts).
   */
  export const satisfy = (
    workload: BlueprintComponent,
  ): SatisfiedOciContainerInstanceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOciContainerInstanceType())
      .withParameters(params)
      .withProvider('OCI')
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

    // Blueprint containerImage → agent 'imageUrl' key
    const image = workload.parameters.getOptionalFieldByName(
      CONTAINER_IMAGE_PARAM,
    );
    if (image !== null) pushParam(params, 'imageUrl', image);

    const satisfiedBuilder: SatisfiedOciContainerInstanceBuilder = {
      withAvailabilityDomain: domain => {
        pushParam(params, 'availabilityDomain', domain);
        return satisfiedBuilder;
      },
      withCompartmentId: compartmentId => {
        pushParam(params, 'compartmentId', compartmentId);
        return satisfiedBuilder;
      },
      withOcpus: ocpus => {
        pushParam(params, 'ocpus', ocpus);
        return satisfiedBuilder;
      },
      withMemoryInGbs: memoryInGbs => {
        pushParam(params, 'memoryInGBs', memoryInGbs);
        return satisfiedBuilder;
      },
      withShape: shape => {
        pushParam(params, 'shape', shape);
        return satisfiedBuilder;
      },
      withAssignPublicIp: assignPublicIp => {
        pushParam(params, 'assignPublicIp', assignPublicIp);
        return satisfiedBuilder;
      },
      withContainerRestartPolicy: policy => {
        pushParam(params, 'containerRestartPolicy', policy);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: OciContainerInstanceConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withImageUrl(config.imageUrl)
      .withAvailabilityDomain(config.availabilityDomain)
      .withCompartmentId(config.compartmentId);

    if (config.description) b.withDescription(config.description);
    if (config.ocpus !== undefined) b.withOcpus(config.ocpus);
    if (config.memoryInGbs !== undefined) b.withMemoryInGbs(config.memoryInGbs);
    if (config.shape) b.withShape(config.shape);
    if (config.port !== undefined) b.withPort(config.port);
    if (config.assignPublicIp !== undefined)
      b.withAssignPublicIp(config.assignPublicIp);
    if (config.containerRestartPolicy)
      b.withContainerRestartPolicy(config.containerRestartPolicy);

    return b.build();
  };
}
