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

// BFF offer id: NetworkAndCompute.IaaS.VirtualMachine (shared across providers)
const GCP_VM_TYPE_NAME = 'VirtualMachine';
const MACHINE_TYPE_PARAM = 'machineType';
const ZONE_PARAM = 'zone';
const IMAGE_PROJECT_PARAM = 'imageProject';
const IMAGE_FAMILY_PARAM = 'imageFamily';
const SERVICE_ACCOUNT_EMAIL_PARAM = 'serviceAccountEmail';

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

function buildGcpVmType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(GCP_VM_TYPE_NAME).build())
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
 * Structural properties (id, version, displayName, description, dependencies,
 * links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedGcpVmBuilder = {
  withMachineType: (machineType: string) => SatisfiedGcpVmBuilder;
  withZone: (zone: string) => SatisfiedGcpVmBuilder;
  withImageProject: (project: string) => SatisfiedGcpVmBuilder;
  withImageFamily: (family: string) => SatisfiedGcpVmBuilder;
  withServiceAccountEmail: (email: string) => SatisfiedGcpVmBuilder;
  build: () => LiveSystemComponent;
};

export type GcpVmBuilder = {
  withId: (id: string) => GcpVmBuilder;
  withVersion: (major: number, minor: number, patch: number) => GcpVmBuilder;
  withDisplayName: (displayName: string) => GcpVmBuilder;
  withDescription: (description: string) => GcpVmBuilder;
  withMachineType: (machineType: string) => GcpVmBuilder;
  withZone: (zone: string) => GcpVmBuilder;
  withImageProject: (project: string) => GcpVmBuilder;
  withImageFamily: (family: string) => GcpVmBuilder;
  withServiceAccountEmail: (email: string) => GcpVmBuilder;
  build: () => LiveSystemComponent;
};

export type GcpVmConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  machineType: string;
  zone: string;
  imageProject: string;
  imageFamily?: string;
  serviceAccountEmail?: string;
};

export namespace GcpVm {
  export const getBuilder = (): GcpVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpVmType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpVmBuilder = {
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
      withMachineType: value => {
        pushParam(params, MACHINE_TYPE_PARAM, value);
        return builder;
      },
      withZone: value => {
        pushParam(params, ZONE_PARAM, value);
        return builder;
      },
      withImageProject: value => {
        pushParam(params, IMAGE_PROJECT_PARAM, value);
        return builder;
      },
      withImageFamily: value => {
        pushParam(params, IMAGE_FAMILY_PARAM, value);
        return builder;
      },
      withServiceAccountEmail: value => {
        pushParam(params, SERVICE_ACCOUNT_EMAIL_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpVmBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpVmType())
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

    const satisfiedBuilder: SatisfiedGcpVmBuilder = {
      withMachineType: value => {
        pushParam(params, MACHINE_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withZone: value => {
        pushParam(params, ZONE_PARAM, value);
        return satisfiedBuilder;
      },
      withImageProject: value => {
        pushParam(params, IMAGE_PROJECT_PARAM, value);
        return satisfiedBuilder;
      },
      withImageFamily: value => {
        pushParam(params, IMAGE_FAMILY_PARAM, value);
        return satisfiedBuilder;
      },
      withServiceAccountEmail: value => {
        pushParam(params, SERVICE_ACCOUNT_EMAIL_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpVmConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withMachineType(config.machineType)
      .withZone(config.zone)
      .withImageProject(config.imageProject);

    if (config.description) b.withDescription(config.description);
    if (config.imageFamily) b.withImageFamily(config.imageFamily);
    if (config.serviceAccountEmail)
      b.withServiceAccountEmail(config.serviceAccountEmail);

    return b.build();
  };
}
