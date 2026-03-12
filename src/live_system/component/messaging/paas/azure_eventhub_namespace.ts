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

const AZURE_EVENTHUB_NAMESPACE_TYPE_NAME = 'EventHubNamespace';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const KAFKA_ENABLED_PARAM = 'kafkaEnabled';
const AUTO_INFLATE_ENABLED_PARAM = 'autoInflateEnabled';
const MAXIMUM_THROUGHPUT_UNITS_PARAM = 'maximumThroughputUnits';
const MINIMUM_TLS_VERSION_PARAM = 'minimumTlsVersion';
const PUBLIC_NETWORK_ACCESS_PARAM = 'publicNetworkAccess';
const SKU_NAME_PARAM = 'skuName';
const SKU_TIER_PARAM = 'skuTier';
const SKU_CAPACITY_PARAM = 'skuCapacity';
const ZONE_REDUNDANT_PARAM = 'zoneRedundant';

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

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Messaging)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_EVENTHUB_NAMESPACE_TYPE_NAME)
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

export type SatisfiedAzureEventHubNamespaceBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureEventHubNamespaceBuilder;
  withAzureResourceGroup: (
    rg: string,
  ) => SatisfiedAzureEventHubNamespaceBuilder;
  withKafkaEnabled: (
    enabled: boolean,
  ) => SatisfiedAzureEventHubNamespaceBuilder;
  withAutoInflateEnabled: (
    enabled: boolean,
  ) => SatisfiedAzureEventHubNamespaceBuilder;
  withMaximumThroughputUnits: (
    units: number,
  ) => SatisfiedAzureEventHubNamespaceBuilder;
  withMinimumTlsVersion: (
    version: string,
  ) => SatisfiedAzureEventHubNamespaceBuilder;
  withPublicNetworkAccess: (
    access: string,
  ) => SatisfiedAzureEventHubNamespaceBuilder;
  withSkuName: (name: string) => SatisfiedAzureEventHubNamespaceBuilder;
  withSkuTier: (tier: string) => SatisfiedAzureEventHubNamespaceBuilder;
  withSkuCapacity: (capacity: number) => SatisfiedAzureEventHubNamespaceBuilder;
  withZoneRedundant: (
    zoneRedundant: boolean,
  ) => SatisfiedAzureEventHubNamespaceBuilder;
  build: () => LiveSystemComponent;
};

export type AzureEventHubNamespaceBuilder = {
  withId: (id: string) => AzureEventHubNamespaceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureEventHubNamespaceBuilder;
  withDisplayName: (displayName: string) => AzureEventHubNamespaceBuilder;
  withDescription: (description: string) => AzureEventHubNamespaceBuilder;
  withAzureRegion: (region: string) => AzureEventHubNamespaceBuilder;
  withAzureResourceGroup: (rg: string) => AzureEventHubNamespaceBuilder;
  withKafkaEnabled: (enabled: boolean) => AzureEventHubNamespaceBuilder;
  withAutoInflateEnabled: (enabled: boolean) => AzureEventHubNamespaceBuilder;
  withMaximumThroughputUnits: (units: number) => AzureEventHubNamespaceBuilder;
  withMinimumTlsVersion: (version: string) => AzureEventHubNamespaceBuilder;
  withPublicNetworkAccess: (access: string) => AzureEventHubNamespaceBuilder;
  withSkuName: (name: string) => AzureEventHubNamespaceBuilder;
  withSkuTier: (tier: string) => AzureEventHubNamespaceBuilder;
  withSkuCapacity: (capacity: number) => AzureEventHubNamespaceBuilder;
  withZoneRedundant: (zoneRedundant: boolean) => AzureEventHubNamespaceBuilder;
  build: () => LiveSystemComponent;
};

export type AzureEventHubNamespaceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  kafkaEnabled?: boolean;
  autoInflateEnabled?: boolean;
  maximumThroughputUnits?: number;
  minimumTlsVersion?: string;
  publicNetworkAccess?: string;
  skuName?: string;
  skuTier?: string;
  skuCapacity?: number;
  zoneRedundant?: boolean;
};

export namespace AzureEventHubNamespace {
  export const getBuilder = (): AzureEventHubNamespaceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureEventHubNamespaceBuilder = {
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
      withKafkaEnabled: value => {
        pushParam(params, KAFKA_ENABLED_PARAM, value);
        return builder;
      },
      withAutoInflateEnabled: value => {
        pushParam(params, AUTO_INFLATE_ENABLED_PARAM, value);
        return builder;
      },
      withMaximumThroughputUnits: value => {
        pushParam(params, MAXIMUM_THROUGHPUT_UNITS_PARAM, value);
        return builder;
      },
      withMinimumTlsVersion: value => {
        pushParam(params, MINIMUM_TLS_VERSION_PARAM, value);
        return builder;
      },
      withPublicNetworkAccess: value => {
        pushParam(params, PUBLIC_NETWORK_ACCESS_PARAM, value);
        return builder;
      },
      withSkuName: value => {
        pushParam(params, SKU_NAME_PARAM, value);
        return builder;
      },
      withSkuTier: value => {
        pushParam(params, SKU_TIER_PARAM, value);
        return builder;
      },
      withSkuCapacity: value => {
        pushParam(params, SKU_CAPACITY_PARAM, value);
        return builder;
      },
      withZoneRedundant: value => {
        pushParam(params, ZONE_REDUNDANT_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureEventHubNamespaceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
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

    const satisfiedBuilder: SatisfiedAzureEventHubNamespaceBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withKafkaEnabled: value => {
        pushParam(params, KAFKA_ENABLED_PARAM, value);
        return satisfiedBuilder;
      },
      withAutoInflateEnabled: value => {
        pushParam(params, AUTO_INFLATE_ENABLED_PARAM, value);
        return satisfiedBuilder;
      },
      withMaximumThroughputUnits: value => {
        pushParam(params, MAXIMUM_THROUGHPUT_UNITS_PARAM, value);
        return satisfiedBuilder;
      },
      withMinimumTlsVersion: value => {
        pushParam(params, MINIMUM_TLS_VERSION_PARAM, value);
        return satisfiedBuilder;
      },
      withPublicNetworkAccess: value => {
        pushParam(params, PUBLIC_NETWORK_ACCESS_PARAM, value);
        return satisfiedBuilder;
      },
      withSkuName: value => {
        pushParam(params, SKU_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withSkuTier: value => {
        pushParam(params, SKU_TIER_PARAM, value);
        return satisfiedBuilder;
      },
      withSkuCapacity: value => {
        pushParam(params, SKU_CAPACITY_PARAM, value);
        return satisfiedBuilder;
      },
      withZoneRedundant: value => {
        pushParam(params, ZONE_REDUNDANT_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureEventHubNamespaceConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withAzureRegion(config.azureRegion)
      .withAzureResourceGroup(config.azureResourceGroup);

    if (config.description) b.withDescription(config.description);
    if (config.kafkaEnabled !== undefined)
      b.withKafkaEnabled(config.kafkaEnabled);
    if (config.autoInflateEnabled !== undefined)
      b.withAutoInflateEnabled(config.autoInflateEnabled);
    if (config.maximumThroughputUnits !== undefined)
      b.withMaximumThroughputUnits(config.maximumThroughputUnits);
    if (config.minimumTlsVersion)
      b.withMinimumTlsVersion(config.minimumTlsVersion);
    if (config.publicNetworkAccess)
      b.withPublicNetworkAccess(config.publicNetworkAccess);
    if (config.skuName) b.withSkuName(config.skuName);
    if (config.skuTier) b.withSkuTier(config.skuTier);
    if (config.skuCapacity !== undefined) b.withSkuCapacity(config.skuCapacity);
    if (config.zoneRedundant !== undefined)
      b.withZoneRedundant(config.zoneRedundant);

    return b.build();
  };
}
