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

const AZURE_STORAGE_ACCOUNT_TYPE_NAME = 'StorageAccount';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const KIND_PARAM = 'kind';
const SKU_PARAM = 'sku';
const ACCESS_TIER_PARAM = 'accessTier';

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
        .withValue(AZURE_STORAGE_ACCOUNT_TYPE_NAME)
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

export type SatisfiedAzureStorageAccountBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureStorageAccountBuilder;
  withAzureResourceGroup: (rg: string) => SatisfiedAzureStorageAccountBuilder;
  withKind: (kind: string) => SatisfiedAzureStorageAccountBuilder;
  withSku: (sku: string) => SatisfiedAzureStorageAccountBuilder;
  withAccessTier: (tier: string) => SatisfiedAzureStorageAccountBuilder;
  build: () => LiveSystemComponent;
};

export type AzureStorageAccountBuilder = {
  withId: (id: string) => AzureStorageAccountBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureStorageAccountBuilder;
  withDisplayName: (displayName: string) => AzureStorageAccountBuilder;
  withDescription: (description: string) => AzureStorageAccountBuilder;
  withAzureRegion: (region: string) => AzureStorageAccountBuilder;
  withAzureResourceGroup: (rg: string) => AzureStorageAccountBuilder;
  withKind: (kind: string) => AzureStorageAccountBuilder;
  withSku: (sku: string) => AzureStorageAccountBuilder;
  withAccessTier: (tier: string) => AzureStorageAccountBuilder;
  build: () => LiveSystemComponent;
};

export type AzureStorageAccountConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  kind?: string;
  sku?: string;
  accessTier?: string;
};

export namespace AzureStorageAccount {
  export const getBuilder = (): AzureStorageAccountBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureStorageAccountBuilder = {
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
      withKind: value => {
        pushParam(params, KIND_PARAM, value);
        return builder;
      },
      withSku: value => {
        pushParam(params, SKU_PARAM, value);
        return builder;
      },
      withAccessTier: value => {
        pushParam(params, ACCESS_TIER_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureStorageAccountBuilder => {
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

    const satisfiedBuilder: SatisfiedAzureStorageAccountBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withKind: value => {
        pushParam(params, KIND_PARAM, value);
        return satisfiedBuilder;
      },
      withSku: value => {
        pushParam(params, SKU_PARAM, value);
        return satisfiedBuilder;
      },
      withAccessTier: value => {
        pushParam(params, ACCESS_TIER_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureStorageAccountConfig,
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
    if (config.kind) b.withKind(config.kind);
    if (config.sku) b.withSku(config.sku);
    if (config.accessTier) b.withAccessTier(config.accessTier);

    return b.build();
  };
}
