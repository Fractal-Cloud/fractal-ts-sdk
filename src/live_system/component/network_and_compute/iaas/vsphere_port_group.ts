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

// Agent constant: OfferVspherePortGroup = "NetworkAndCompute.IaaS.VspherePortGroup"
const VSPHERE_PORT_GROUP_TYPE_NAME = 'VspherePortGroup';
const DV_SWITCH_NAME_PARAM = 'dvSwitchName';
const DATACENTER_PARAM = 'datacenter';
const VLAN_ID_PARAM = 'vlanId';
const NUM_PORTS_PARAM = 'numPorts';
const PORT_BINDING_PARAM = 'portBinding';

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

function buildVspherePortGroupType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(VSPHERE_PORT_GROUP_TYPE_NAME)
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
export type SatisfiedVspherePortGroupBuilder = {
  withDvSwitchName: (name: string) => SatisfiedVspherePortGroupBuilder;
  withDatacenter: (datacenter: string) => SatisfiedVspherePortGroupBuilder;
  withVlanId: (vlanId: number) => SatisfiedVspherePortGroupBuilder;
  withNumPorts: (numPorts: number) => SatisfiedVspherePortGroupBuilder;
  withPortBinding: (binding: string) => SatisfiedVspherePortGroupBuilder;
  build: () => LiveSystemComponent;
};

export type VspherePortGroupBuilder = {
  withId: (id: string) => VspherePortGroupBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => VspherePortGroupBuilder;
  withDisplayName: (displayName: string) => VspherePortGroupBuilder;
  withDescription: (description: string) => VspherePortGroupBuilder;
  withDvSwitchName: (name: string) => VspherePortGroupBuilder;
  withDatacenter: (datacenter: string) => VspherePortGroupBuilder;
  withVlanId: (vlanId: number) => VspherePortGroupBuilder;
  withNumPorts: (numPorts: number) => VspherePortGroupBuilder;
  withPortBinding: (binding: string) => VspherePortGroupBuilder;
  build: () => LiveSystemComponent;
};

export type VspherePortGroupConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  dvSwitchName: string;
  datacenter: string;
  vlanId: number;
  numPorts?: number;
  portBinding?: string;
};

export namespace VspherePortGroup {
  export const getBuilder = (): VspherePortGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildVspherePortGroupType())
      .withParameters(params)
      .withProvider('VMware');

    const builder: VspherePortGroupBuilder = {
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
      withDvSwitchName: value => {
        pushParam(params, DV_SWITCH_NAME_PARAM, value);
        return builder;
      },
      withDatacenter: value => {
        pushParam(params, DATACENTER_PARAM, value);
        return builder;
      },
      withVlanId: value => {
        pushParam(params, VLAN_ID_PARAM, value);
        return builder;
      },
      withNumPorts: value => {
        pushParam(params, NUM_PORTS_PARAM, value);
        return builder;
      },
      withPortBinding: value => {
        pushParam(params, PORT_BINDING_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedVspherePortGroupBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildVspherePortGroupType())
      .withParameters(params)
      .withProvider('VMware')
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

    const satisfiedBuilder: SatisfiedVspherePortGroupBuilder = {
      withDvSwitchName: value => {
        pushParam(params, DV_SWITCH_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withDatacenter: value => {
        pushParam(params, DATACENTER_PARAM, value);
        return satisfiedBuilder;
      },
      withVlanId: value => {
        pushParam(params, VLAN_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withNumPorts: value => {
        pushParam(params, NUM_PORTS_PARAM, value);
        return satisfiedBuilder;
      },
      withPortBinding: value => {
        pushParam(params, PORT_BINDING_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: VspherePortGroupConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withDvSwitchName(config.dvSwitchName)
      .withDatacenter(config.datacenter)
      .withVlanId(config.vlanId);

    if (config.description) b.withDescription(config.description);
    if (config.numPorts !== undefined) b.withNumPorts(config.numPorts);
    if (config.portBinding) b.withPortBinding(config.portBinding);

    return b.build();
  };
}
