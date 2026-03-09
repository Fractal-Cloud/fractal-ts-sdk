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

// Agent constant: OCI_INSTANCE_COMPONENT_NAME = "OciInstance"
const OCI_INSTANCE_TYPE_NAME = 'OciInstance';
const COMPARTMENT_ID_PARAM = 'compartmentId';
const AVAILABILITY_DOMAIN_PARAM = 'availabilityDomain';
const SHAPE_PARAM = 'shape';
const IMAGE_ID_PARAM = 'imageId';
const OCPUS_PARAM = 'ocpus';
const MEMORY_IN_GBS_PARAM = 'memoryInGbs';
const SSH_PUBLIC_KEY_PARAM = 'sshPublicKey';

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

function buildOciInstanceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OCI_INSTANCE_TYPE_NAME).build(),
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
export type SatisfiedOciInstanceBuilder = {
  withCompartmentId: (id: string) => SatisfiedOciInstanceBuilder;
  withAvailabilityDomain: (ad: string) => SatisfiedOciInstanceBuilder;
  withShape: (shape: string) => SatisfiedOciInstanceBuilder;
  withImageId: (imageId: string) => SatisfiedOciInstanceBuilder;
  withOcpus: (ocpus: number) => SatisfiedOciInstanceBuilder;
  withMemoryInGbs: (gb: number) => SatisfiedOciInstanceBuilder;
  withSshPublicKey: (key: string) => SatisfiedOciInstanceBuilder;
  build: () => LiveSystemComponent;
};

export type OciInstanceBuilder = {
  withId: (id: string) => OciInstanceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OciInstanceBuilder;
  withDisplayName: (displayName: string) => OciInstanceBuilder;
  withDescription: (description: string) => OciInstanceBuilder;
  withCompartmentId: (id: string) => OciInstanceBuilder;
  withAvailabilityDomain: (ad: string) => OciInstanceBuilder;
  withShape: (shape: string) => OciInstanceBuilder;
  withImageId: (imageId: string) => OciInstanceBuilder;
  withOcpus: (ocpus: number) => OciInstanceBuilder;
  withMemoryInGbs: (gb: number) => OciInstanceBuilder;
  withSshPublicKey: (key: string) => OciInstanceBuilder;
  build: () => LiveSystemComponent;
};

export type OciInstanceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  compartmentId: string;
  availabilityDomain: string;
  shape: string;
  imageId: string;
  ocpus?: number;
  memoryInGbs?: number;
  sshPublicKey?: string;
};

export namespace OciInstance {
  export const getBuilder = (): OciInstanceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOciInstanceType())
      .withParameters(params)
      .withProvider('OCI');

    const builder: OciInstanceBuilder = {
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
      withCompartmentId: value => {
        pushParam(params, COMPARTMENT_ID_PARAM, value);
        return builder;
      },
      withAvailabilityDomain: value => {
        pushParam(params, AVAILABILITY_DOMAIN_PARAM, value);
        return builder;
      },
      withShape: value => {
        pushParam(params, SHAPE_PARAM, value);
        return builder;
      },
      withImageId: value => {
        pushParam(params, IMAGE_ID_PARAM, value);
        return builder;
      },
      withOcpus: value => {
        pushParam(params, OCPUS_PARAM, value);
        return builder;
      },
      withMemoryInGbs: value => {
        pushParam(params, MEMORY_IN_GBS_PARAM, value);
        return builder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOciInstanceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOciInstanceType())
      .withParameters(params)
      .withProvider('OCI')
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

    const satisfiedBuilder: SatisfiedOciInstanceBuilder = {
      withCompartmentId: value => {
        pushParam(params, COMPARTMENT_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withAvailabilityDomain: value => {
        pushParam(params, AVAILABILITY_DOMAIN_PARAM, value);
        return satisfiedBuilder;
      },
      withShape: value => {
        pushParam(params, SHAPE_PARAM, value);
        return satisfiedBuilder;
      },
      withImageId: value => {
        pushParam(params, IMAGE_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withOcpus: value => {
        pushParam(params, OCPUS_PARAM, value);
        return satisfiedBuilder;
      },
      withMemoryInGbs: value => {
        pushParam(params, MEMORY_IN_GBS_PARAM, value);
        return satisfiedBuilder;
      },
      withSshPublicKey: value => {
        pushParam(params, SSH_PUBLIC_KEY_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: OciInstanceConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCompartmentId(config.compartmentId)
      .withAvailabilityDomain(config.availabilityDomain)
      .withShape(config.shape)
      .withImageId(config.imageId);

    if (config.description) b.withDescription(config.description);
    if (config.ocpus !== undefined) b.withOcpus(config.ocpus);
    if (config.memoryInGbs !== undefined) b.withMemoryInGbs(config.memoryInGbs);
    if (config.sshPublicKey) b.withSshPublicKey(config.sshPublicKey);

    return b.build();
  };
}
