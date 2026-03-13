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

// Agent constant: API_MANAGEMENT_COMPONENT_NAME = "ApiManagement"
const AZURE_API_MANAGEMENT_TYPE_NAME = 'ApiManagement';
export const AZURE_REGION_PARAM = 'azureRegion';
export const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
export const PUBLISHER_NAME_PARAM = 'publisherName';
export const PUBLISHER_EMAIL_PARAM = 'publisherEmail';
export const SKU_NAME_PARAM = 'skuName';
export const PUBLIC_NETWORK_ACCESS_ENABLED_PARAM = 'publicNetworkAccessEnabled';

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

function buildAzureApiManagementType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_API_MANAGEMENT_TYPE_NAME)
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
export type SatisfiedAzureApiManagementBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureApiManagementBuilder;
  withAzureResourceGroup: (group: string) => SatisfiedAzureApiManagementBuilder;
  withPublisherName: (name: string) => SatisfiedAzureApiManagementBuilder;
  withPublisherEmail: (email: string) => SatisfiedAzureApiManagementBuilder;
  withSkuName: (sku: string) => SatisfiedAzureApiManagementBuilder;
  withPublicNetworkAccessEnabled: (
    enabled: boolean,
  ) => SatisfiedAzureApiManagementBuilder;
  build: () => LiveSystemComponent;
};

export type AzureApiManagementBuilder = {
  withId: (id: string) => AzureApiManagementBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureApiManagementBuilder;
  withDisplayName: (displayName: string) => AzureApiManagementBuilder;
  withDescription: (description: string) => AzureApiManagementBuilder;
  withAzureRegion: (region: string) => AzureApiManagementBuilder;
  withAzureResourceGroup: (group: string) => AzureApiManagementBuilder;
  withPublisherName: (name: string) => AzureApiManagementBuilder;
  withPublisherEmail: (email: string) => AzureApiManagementBuilder;
  withSkuName: (sku: string) => AzureApiManagementBuilder;
  withPublicNetworkAccessEnabled: (
    enabled: boolean,
  ) => AzureApiManagementBuilder;
  build: () => LiveSystemComponent;
};

export type AzureApiManagementConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion?: string;
  azureResourceGroup?: string;
  publisherName?: string;
  publisherEmail?: string;
  skuName?: string;
  publicNetworkAccessEnabled?: boolean;
};

export namespace AzureApiManagement {
  export const getBuilder = (): AzureApiManagementBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureApiManagementType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureApiManagementBuilder = {
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
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return builder;
      },
      withPublisherName: value => {
        pushParam(params, PUBLISHER_NAME_PARAM, value);
        return builder;
      },
      withPublisherEmail: value => {
        pushParam(params, PUBLISHER_EMAIL_PARAM, value);
        return builder;
      },
      withSkuName: value => {
        pushParam(params, SKU_NAME_PARAM, value);
        return builder;
      },
      withPublicNetworkAccessEnabled: value => {
        pushParam(params, PUBLIC_NETWORK_ACCESS_ENABLED_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureApiManagementBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureApiManagementType())
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

    const satisfiedBuilder: SatisfiedAzureApiManagementBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withPublisherName: value => {
        pushParam(params, PUBLISHER_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withPublisherEmail: value => {
        pushParam(params, PUBLISHER_EMAIL_PARAM, value);
        return satisfiedBuilder;
      },
      withSkuName: value => {
        pushParam(params, SKU_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withPublicNetworkAccessEnabled: value => {
        pushParam(params, PUBLIC_NETWORK_ACCESS_ENABLED_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureApiManagementConfig,
  ): LiveSystemComponent => {
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
    if (config.azureResourceGroup)
      b.withAzureResourceGroup(config.azureResourceGroup);
    if (config.publisherName) b.withPublisherName(config.publisherName);
    if (config.publisherEmail) b.withPublisherEmail(config.publisherEmail);
    if (config.skuName) b.withSkuName(config.skuName);
    if (config.publicNetworkAccessEnabled !== undefined)
      b.withPublicNetworkAccessEnabled(config.publicNetworkAccessEnabled);

    return b.build();
  };
}
