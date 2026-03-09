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

// Agent constant: HETZNER_SUBNET_COMPONENT_NAME = "HetznerSubnet"
const HETZNER_SUBNET_TYPE_NAME = 'HetznerSubnet';
const NETWORK_ZONE_PARAM = 'networkZone';
const TYPE_PARAM = 'type';

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

function buildHetznerSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(HETZNER_SUBNET_TYPE_NAME).build(),
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
export type SatisfiedHetznerSubnetBuilder = {
  withNetworkZone: (zone: string) => SatisfiedHetznerSubnetBuilder;
  withType: (type: string) => SatisfiedHetznerSubnetBuilder;
  build: () => LiveSystemComponent;
};

export type HetznerSubnetBuilder = {
  withId: (id: string) => HetznerSubnetBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => HetznerSubnetBuilder;
  withDisplayName: (displayName: string) => HetznerSubnetBuilder;
  withDescription: (description: string) => HetznerSubnetBuilder;
  withCidrBlock: (cidrBlock: string) => HetznerSubnetBuilder;
  withNetworkZone: (zone: string) => HetznerSubnetBuilder;
  withType: (type: string) => HetznerSubnetBuilder;
  build: () => LiveSystemComponent;
};

export type HetznerSubnetConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
  networkZone: string;
  type?: string;
};

export namespace HetznerSubnet {
  export const getBuilder = (): HetznerSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildHetznerSubnetType())
      .withParameters(params)
      .withProvider('Hetzner');

    const builder: HetznerSubnetBuilder = {
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
      withCidrBlock: value => {
        pushParam(params, CIDR_BLOCK_PARAM, value);
        return builder;
      },
      withNetworkZone: value => {
        pushParam(params, NETWORK_ZONE_PARAM, value);
        return builder;
      },
      withType: value => {
        pushParam(params, TYPE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedHetznerSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildHetznerSubnetType())
      .withParameters(params)
      .withProvider('Hetzner')
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

    const satisfiedBuilder: SatisfiedHetznerSubnetBuilder = {
      withNetworkZone: value => {
        pushParam(params, NETWORK_ZONE_PARAM, value);
        return satisfiedBuilder;
      },
      withType: value => {
        pushParam(params, TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: HetznerSubnetConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCidrBlock(config.cidrBlock)
      .withNetworkZone(config.networkZone);

    if (config.description) b.withDescription(config.description);
    if (config.type) b.withType(config.type);

    return b.build();
  };
}
