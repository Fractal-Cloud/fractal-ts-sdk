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
import {CIDR_BLOCK_PARAM} from '../../../../fractal/component/network_and_compute/iaas/subnet';

// Agent constant: OfferVsphereVlan = "NetworkAndCompute.IaaS.VsphereVlan"
const VSPHERE_VLAN_TYPE_NAME = 'VsphereVlan';
const VLAN_ID_PARAM = 'vlanId';
const GATEWAY_PARAM = 'gateway';
const DV_SWITCH_NAME_PARAM = 'dvSwitchName';
const DATACENTER_PARAM = 'datacenter';
const NAME_PARAM = 'name';

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

function buildVsphereVlanType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(VSPHERE_VLAN_TYPE_NAME).build(),
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
 * Structural properties (id, version, displayName, description, cidrBlock,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedVsphereVlanBuilder = {
  withName: (name: string) => SatisfiedVsphereVlanBuilder;
  withVlanId: (vlanId: number) => SatisfiedVsphereVlanBuilder;
  withGateway: (gateway: string) => SatisfiedVsphereVlanBuilder;
  withDvSwitchName: (name: string) => SatisfiedVsphereVlanBuilder;
  withDatacenter: (datacenter: string) => SatisfiedVsphereVlanBuilder;
  build: () => LiveSystemComponent;
};

export type VsphereVlanBuilder = {
  withId: (id: string) => VsphereVlanBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => VsphereVlanBuilder;
  withDisplayName: (displayName: string) => VsphereVlanBuilder;
  withDescription: (description: string) => VsphereVlanBuilder;
  withName: (name: string) => VsphereVlanBuilder;
  withCidrBlock: (cidrBlock: string) => VsphereVlanBuilder;
  withVlanId: (vlanId: number) => VsphereVlanBuilder;
  withGateway: (gateway: string) => VsphereVlanBuilder;
  withDvSwitchName: (name: string) => VsphereVlanBuilder;
  withDatacenter: (datacenter: string) => VsphereVlanBuilder;
  build: () => LiveSystemComponent;
};

export type VsphereVlanConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
  vlanId: number;
  gateway: string;
  dvSwitchName: string;
  datacenter: string;
};

export namespace VsphereVlan {
  export const getBuilder = (): VsphereVlanBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildVsphereVlanType())
      .withParameters(params)
      .withProvider('VMware');

    const builder: VsphereVlanBuilder = {
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
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return builder;
      },
      withCidrBlock: value => {
        pushParam(params, CIDR_BLOCK_PARAM, value);
        return builder;
      },
      withVlanId: value => {
        pushParam(params, VLAN_ID_PARAM, value);
        return builder;
      },
      withGateway: value => {
        pushParam(params, GATEWAY_PARAM, value);
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
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedVsphereVlanBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildVsphereVlanType())
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

    const cidrBlock =
      blueprint.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM);
    if (cidrBlock !== null)
      pushParam(params, CIDR_BLOCK_PARAM, String(cidrBlock));

    const satisfiedBuilder: SatisfiedVsphereVlanBuilder = {
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withVlanId: value => {
        pushParam(params, VLAN_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withGateway: value => {
        pushParam(params, GATEWAY_PARAM, value);
        return satisfiedBuilder;
      },
      withDvSwitchName: value => {
        pushParam(params, DV_SWITCH_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withDatacenter: value => {
        pushParam(params, DATACENTER_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: VsphereVlanConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCidrBlock(config.cidrBlock)
      .withVlanId(config.vlanId)
      .withGateway(config.gateway)
      .withDvSwitchName(config.dvSwitchName)
      .withDatacenter(config.datacenter);

    if (config.description) b.withDescription(config.description);

    return b.build();
  };
}
