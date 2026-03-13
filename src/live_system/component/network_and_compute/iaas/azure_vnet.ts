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

// BFF offer id: NetworkAndCompute.IaaS.VNet
const AZURE_VNET_TYPE_NAME = 'VNet';
const LOCATION_PARAM = 'location';
const RESOURCE_GROUP_PARAM = 'resourceGroup';

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

function buildAzureVnetType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_VNET_TYPE_NAME).build(),
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
export type SatisfiedAzureVnetBuilder = {
  withLocation: (location: string) => SatisfiedAzureVnetBuilder;
  withResourceGroup: (rg: string) => SatisfiedAzureVnetBuilder;
  build: () => LiveSystemComponent;
};

export type AzureVnetBuilder = {
  withId: (id: string) => AzureVnetBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureVnetBuilder;
  withDisplayName: (displayName: string) => AzureVnetBuilder;
  withDescription: (description: string) => AzureVnetBuilder;
  withCidrBlock: (cidrBlock: string) => AzureVnetBuilder;
  withLocation: (location: string) => AzureVnetBuilder;
  withResourceGroup: (rg: string) => AzureVnetBuilder;
  build: () => LiveSystemComponent;
};

export type AzureVnetConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  cidrBlock: string;
  location: string;
  resourceGroup: string;
};

export namespace AzureVnet {
  export const getBuilder = (): AzureVnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureVnetType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureVnetBuilder = {
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
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return builder;
      },
      withResourceGroup: value => {
        pushParam(params, RESOURCE_GROUP_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureVnetBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureVnetType())
      .withParameters(params)
      .withProvider('Azure')
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

    const satisfiedBuilder: SatisfiedAzureVnetBuilder = {
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return satisfiedBuilder;
      },
      withResourceGroup: value => {
        pushParam(params, RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AzureVnetConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withCidrBlock(config.cidrBlock)
      .withLocation(config.location)
      .withResourceGroup(config.resourceGroup);

    if (config.description) b.withDescription(config.description);

    return b.build();
  };
}
