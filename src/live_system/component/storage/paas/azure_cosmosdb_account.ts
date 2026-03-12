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

const AZURE_COSMOSDB_ACCOUNT_TYPE_NAME = 'CosmosDbAccount';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const MAX_TOTAL_THROUGHPUT_PARAM = 'maxTotalThroughput';
const PUBLIC_NETWORK_ACCESS_PARAM = 'publicNetworkAccess';

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
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_COSMOSDB_ACCOUNT_TYPE_NAME)
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

export type SatisfiedAzureCosmosDbAccountBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureCosmosDbAccountBuilder;
  withAzureResourceGroup: (rg: string) => SatisfiedAzureCosmosDbAccountBuilder;
  withMaxTotalThroughput: (
    throughput: number,
  ) => SatisfiedAzureCosmosDbAccountBuilder;
  withPublicNetworkAccess: (
    access: string,
  ) => SatisfiedAzureCosmosDbAccountBuilder;
  build: () => LiveSystemComponent;
};

export type AzureCosmosDbAccountBuilder = {
  withId: (id: string) => AzureCosmosDbAccountBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureCosmosDbAccountBuilder;
  withDisplayName: (displayName: string) => AzureCosmosDbAccountBuilder;
  withDescription: (description: string) => AzureCosmosDbAccountBuilder;
  withAzureRegion: (region: string) => AzureCosmosDbAccountBuilder;
  withAzureResourceGroup: (rg: string) => AzureCosmosDbAccountBuilder;
  withMaxTotalThroughput: (throughput: number) => AzureCosmosDbAccountBuilder;
  withPublicNetworkAccess: (access: string) => AzureCosmosDbAccountBuilder;
  build: () => LiveSystemComponent;
};

export type AzureCosmosDbAccountConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  maxTotalThroughput?: number;
  publicNetworkAccess?: string;
};

export namespace AzureCosmosDbAccount {
  export const getBuilder = (): AzureCosmosDbAccountBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureCosmosDbAccountBuilder = {
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
      withMaxTotalThroughput: value => {
        pushParam(params, MAX_TOTAL_THROUGHPUT_PARAM, value);
        return builder;
      },
      withPublicNetworkAccess: value => {
        pushParam(params, PUBLIC_NETWORK_ACCESS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureCosmosDbAccountBuilder => {
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

    const satisfiedBuilder: SatisfiedAzureCosmosDbAccountBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withMaxTotalThroughput: value => {
        pushParam(params, MAX_TOTAL_THROUGHPUT_PARAM, value);
        return satisfiedBuilder;
      },
      withPublicNetworkAccess: value => {
        pushParam(params, PUBLIC_NETWORK_ACCESS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureCosmosDbAccountConfig,
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
    if (config.maxTotalThroughput !== undefined)
      b.withMaxTotalThroughput(config.maxTotalThroughput);
    if (config.publicNetworkAccess)
      b.withPublicNetworkAccess(config.publicNetworkAccess);

    return b.build();
  };
}
