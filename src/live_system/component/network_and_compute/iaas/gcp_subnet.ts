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

// Agent constant: GCP_SUBNET_COMPONENT_NAME = "GcpSubnet"
const GCP_SUBNET_TYPE_NAME = 'GcpSubnet';
const REGION_PARAM = 'region';
const PRIVATE_IP_GOOGLE_ACCESS_PARAM = 'privateIpGoogleAccess';

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

function buildGcpSubnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCP_SUBNET_TYPE_NAME).build(),
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
export type SatisfiedGcpSubnetBuilder = {
  withRegion: (region: string) => SatisfiedGcpSubnetBuilder;
  withPrivateIpGoogleAccess: (enabled: boolean) => SatisfiedGcpSubnetBuilder;
  build: () => LiveSystemComponent;
};

export type GcpSubnetBuilder = {
  withId: (id: string) => GcpSubnetBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpSubnetBuilder;
  withDisplayName: (displayName: string) => GcpSubnetBuilder;
  withDescription: (description: string) => GcpSubnetBuilder;
  withCidrBlock: (cidrBlock: string) => GcpSubnetBuilder;
  withRegion: (region: string) => GcpSubnetBuilder;
  withPrivateIpGoogleAccess: (enabled: boolean) => GcpSubnetBuilder;
  build: () => LiveSystemComponent;
};

export type GcpSubnetConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
  region: string;
  privateIpGoogleAccess?: boolean;
};

export namespace GcpSubnet {
  export const getBuilder = (): GcpSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpSubnetType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpSubnetBuilder = {
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
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return builder;
      },
      withPrivateIpGoogleAccess: value => {
        pushParam(params, PRIVATE_IP_GOOGLE_ACCESS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpSubnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpSubnetType())
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

    const cidrBlock =
      blueprint.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM);
    if (cidrBlock !== null)
      pushParam(params, CIDR_BLOCK_PARAM, String(cidrBlock));

    const satisfiedBuilder: SatisfiedGcpSubnetBuilder = {
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withPrivateIpGoogleAccess: value => {
        pushParam(params, PRIVATE_IP_GOOGLE_ACCESS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpSubnetConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCidrBlock(config.cidrBlock)
      .withRegion(config.region);

    if (config.description) b.withDescription(config.description);
    if (config.privateIpGoogleAccess !== undefined)
      b.withPrivateIpGoogleAccess(config.privateIpGoogleAccess);

    return b.build();
  };
}
