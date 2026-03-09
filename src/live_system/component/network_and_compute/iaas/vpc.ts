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

// Agent constant: VPC_COMPONENT_NAME = "AwsVpc"
const AWS_VPC_TYPE_NAME = 'AwsVpc';
const INSTANCE_TENANCY_PARAM = 'instanceTenancy';
const ENABLE_DNS_SUPPORT_PARAM = 'enableDnsSupport';
const ENABLE_DNS_HOSTNAMES_PARAM = 'enableDnsHostnames';

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

function buildAwsVpcType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_VPC_TYPE_NAME).build(),
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
export type SatisfiedAwsVpcBuilder = {
  withInstanceTenancy: (
    instanceTenancy: 'default' | 'dedicated',
  ) => SatisfiedAwsVpcBuilder;
  withEnableDnsSupport: (enable: boolean) => SatisfiedAwsVpcBuilder;
  withEnableDnsHostnames: (enable: boolean) => SatisfiedAwsVpcBuilder;
  build: () => LiveSystemComponent;
};

export type AwsVpcBuilder = {
  withId: (id: string) => AwsVpcBuilder;
  withVersion: (major: number, minor: number, patch: number) => AwsVpcBuilder;
  withDisplayName: (displayName: string) => AwsVpcBuilder;
  withDescription: (description: string) => AwsVpcBuilder;
  withCidrBlock: (cidrBlock: string) => AwsVpcBuilder;
  withInstanceTenancy: (
    instanceTenancy: 'default' | 'dedicated',
  ) => AwsVpcBuilder;
  withEnableDnsSupport: (enable: boolean) => AwsVpcBuilder;
  withEnableDnsHostnames: (enable: boolean) => AwsVpcBuilder;
  build: () => LiveSystemComponent;
};

export type AwsVpcConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
  instanceTenancy?: 'default' | 'dedicated';
  enableDnsSupport?: boolean;
  enableDnsHostnames?: boolean;
};

export namespace AwsVpc {
  export const getBuilder = (): AwsVpcBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsVpcType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsVpcBuilder = {
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
      withInstanceTenancy: value => {
        pushParam(params, INSTANCE_TENANCY_PARAM, value);
        return builder;
      },
      withEnableDnsSupport: value => {
        pushParam(params, ENABLE_DNS_SUPPORT_PARAM, value);
        return builder;
      },
      withEnableDnsHostnames: value => {
        pushParam(params, ENABLE_DNS_HOSTNAMES_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsVpcBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsVpcType())
      .withParameters(params)
      .withProvider('AWS')
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

    const satisfiedBuilder: SatisfiedAwsVpcBuilder = {
      withInstanceTenancy: value => {
        pushParam(params, INSTANCE_TENANCY_PARAM, value);
        return satisfiedBuilder;
      },
      withEnableDnsSupport: value => {
        pushParam(params, ENABLE_DNS_SUPPORT_PARAM, value);
        return satisfiedBuilder;
      },
      withEnableDnsHostnames: value => {
        pushParam(params, ENABLE_DNS_HOSTNAMES_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsVpcConfig): LiveSystemComponent => {
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
    if (config.instanceTenancy) b.withInstanceTenancy(config.instanceTenancy);
    if (config.enableDnsSupport !== undefined)
      b.withEnableDnsSupport(config.enableDnsSupport);
    if (config.enableDnsHostnames !== undefined)
      b.withEnableDnsHostnames(config.enableDnsHostnames);

    return b.build();
  };
}
