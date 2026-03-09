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
import {CIDR_BLOCK_PARAM} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';

// Agent constant: GCP_VPC_COMPONENT_NAME = "GcpVpc"
const GCP_VPC_TYPE_NAME = 'GcpVpc';
const AUTO_CREATE_SUBNETWORKS_PARAM = 'autoCreateSubnetworks';
const ROUTING_MODE_PARAM = 'routingMode';

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

function buildGcpVpcType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GCP_VPC_TYPE_NAME).build(),
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
export type SatisfiedGcpVpcBuilder = {
  withAutoCreateSubnetworks: (enabled: boolean) => SatisfiedGcpVpcBuilder;
  withRoutingMode: (mode: 'REGIONAL' | 'GLOBAL') => SatisfiedGcpVpcBuilder;
  build: () => LiveSystemComponent;
};

export type GcpVpcBuilder = {
  withId: (id: string) => GcpVpcBuilder;
  withVersion: (major: number, minor: number, patch: number) => GcpVpcBuilder;
  withDisplayName: (displayName: string) => GcpVpcBuilder;
  withDescription: (description: string) => GcpVpcBuilder;
  withCidrBlock: (cidrBlock: string) => GcpVpcBuilder;
  withAutoCreateSubnetworks: (enabled: boolean) => GcpVpcBuilder;
  withRoutingMode: (mode: 'REGIONAL' | 'GLOBAL') => GcpVpcBuilder;
  build: () => LiveSystemComponent;
};

export type GcpVpcConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
  autoCreateSubnetworks?: boolean;
  routingMode?: 'REGIONAL' | 'GLOBAL';
};

export namespace GcpVpc {
  export const getBuilder = (): GcpVpcBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpVpcType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpVpcBuilder = {
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
      withAutoCreateSubnetworks: value => {
        pushParam(params, AUTO_CREATE_SUBNETWORKS_PARAM, value);
        return builder;
      },
      withRoutingMode: value => {
        pushParam(params, ROUTING_MODE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpVpcBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpVpcType())
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

    const satisfiedBuilder: SatisfiedGcpVpcBuilder = {
      withAutoCreateSubnetworks: value => {
        pushParam(params, AUTO_CREATE_SUBNETWORKS_PARAM, value);
        return satisfiedBuilder;
      },
      withRoutingMode: value => {
        pushParam(params, ROUTING_MODE_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpVpcConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCidrBlock(config.cidrBlock);

    if (config.description) b.withDescription(config.description);
    if (config.autoCreateSubnetworks !== undefined)
      b.withAutoCreateSubnetworks(config.autoCreateSubnetworks);
    if (config.routingMode) b.withRoutingMode(config.routingMode);

    return b.build();
  };
}
