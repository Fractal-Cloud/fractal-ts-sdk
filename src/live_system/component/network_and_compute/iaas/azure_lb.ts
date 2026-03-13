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

// BFF offer id: NetworkAndCompute.IaaS.LoadBalancer (shared across providers)
const TYPE_NAME = 'LoadBalancer';
const AZURE_REGION_PARAM = 'azureRegion';
const RESOURCE_GROUP_NAME_PARAM = 'resourceGroupName';
const SKU_PARAM = 'sku';
const FRONTEND_IP_CONFIGURATION_PARAM = 'frontendIpConfiguration';

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

function buildAzureLbType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(TYPE_NAME).build())
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

// ── Public types ──────────────────────────────────────────────────────────────

export type FrontendIpConfiguration = {
  name: string;
  subnetId: string;
  privateIpAddressAllocation: 'Dynamic' | 'Static';
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedAzureLbBuilder = {
  withAzureRegion: (azureRegion: string) => SatisfiedAzureLbBuilder;
  withResourceGroupName: (resourceGroupName: string) => SatisfiedAzureLbBuilder;
  withSku: (sku: 'Basic' | 'Standard') => SatisfiedAzureLbBuilder;
  withFrontendIpConfiguration: (
    frontendIpConfiguration: FrontendIpConfiguration[],
  ) => SatisfiedAzureLbBuilder;
  build: () => LiveSystemComponent;
};

export type AzureLbBuilder = {
  withId: (id: string) => AzureLbBuilder;
  withVersion: (major: number, minor: number, patch: number) => AzureLbBuilder;
  withDisplayName: (displayName: string) => AzureLbBuilder;
  withDescription: (description: string) => AzureLbBuilder;
  withAzureRegion: (azureRegion: string) => AzureLbBuilder;
  withResourceGroupName: (resourceGroupName: string) => AzureLbBuilder;
  withSku: (sku: 'Basic' | 'Standard') => AzureLbBuilder;
  withFrontendIpConfiguration: (
    frontendIpConfiguration: FrontendIpConfiguration[],
  ) => AzureLbBuilder;
  build: () => LiveSystemComponent;
};

export type AzureLbConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion?: string;
  resourceGroupName?: string;
  sku?: 'Basic' | 'Standard';
  frontendIpConfiguration?: FrontendIpConfiguration[];
};

export namespace AzureLb {
  export const getBuilder = (): AzureLbBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureLbType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureLbBuilder = {
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
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return builder;
      },
      withResourceGroupName: value => {
        pushParam(params, RESOURCE_GROUP_NAME_PARAM, value);
        return builder;
      },
      withSku: value => {
        pushParam(params, SKU_PARAM, value);
        return builder;
      },
      withFrontendIpConfiguration: value => {
        pushParam(params, FRONTEND_IP_CONFIGURATION_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureLbBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureLbType())
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

    const satisfiedBuilder: SatisfiedAzureLbBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withResourceGroupName: value => {
        pushParam(params, RESOURCE_GROUP_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withSku: value => {
        pushParam(params, SKU_PARAM, value);
        return satisfiedBuilder;
      },
      withFrontendIpConfiguration: value => {
        pushParam(params, FRONTEND_IP_CONFIGURATION_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AzureLbConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.azureRegion) b.withAzureRegion(config.azureRegion);
    if (config.resourceGroupName)
      b.withResourceGroupName(config.resourceGroupName);
    if (config.sku) b.withSku(config.sku);
    if (config.frontendIpConfiguration)
      b.withFrontendIpConfiguration(config.frontendIpConfiguration);

    return b.build();
  };
}
