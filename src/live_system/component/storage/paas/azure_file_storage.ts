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

const AZURE_FILE_STORAGE_TYPE_NAME = 'FileStorage';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const ACCESS_TIER_PARAM = 'accessTier';
const SHARE_QUOTA_PARAM = 'shareQuota';

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
        .withValue(AZURE_FILE_STORAGE_TYPE_NAME)
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

export type SatisfiedAzureFileStorageBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureFileStorageBuilder;
  withAzureResourceGroup: (rg: string) => SatisfiedAzureFileStorageBuilder;
  withAccessTier: (tier: string) => SatisfiedAzureFileStorageBuilder;
  withShareQuota: (quota: number) => SatisfiedAzureFileStorageBuilder;
  build: () => LiveSystemComponent;
};

export type AzureFileStorageBuilder = {
  withId: (id: string) => AzureFileStorageBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureFileStorageBuilder;
  withDisplayName: (displayName: string) => AzureFileStorageBuilder;
  withDescription: (description: string) => AzureFileStorageBuilder;
  withAzureRegion: (region: string) => AzureFileStorageBuilder;
  withAzureResourceGroup: (rg: string) => AzureFileStorageBuilder;
  withAccessTier: (tier: string) => AzureFileStorageBuilder;
  withShareQuota: (quota: number) => AzureFileStorageBuilder;
  build: () => LiveSystemComponent;
};

export type AzureFileStorageConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  accessTier?: string;
  shareQuota?: number;
};

export namespace AzureFileStorage {
  export const getBuilder = (): AzureFileStorageBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureFileStorageBuilder = {
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
      withAccessTier: value => {
        pushParam(params, ACCESS_TIER_PARAM, value);
        return builder;
      },
      withShareQuota: value => {
        pushParam(params, SHARE_QUOTA_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureFileStorageBuilder => {
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

    const satisfiedBuilder: SatisfiedAzureFileStorageBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withAccessTier: value => {
        pushParam(params, ACCESS_TIER_PARAM, value);
        return satisfiedBuilder;
      },
      withShareQuota: value => {
        pushParam(params, SHARE_QUOTA_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureFileStorageConfig,
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
    if (config.accessTier) b.withAccessTier(config.accessTier);
    if (config.shareQuota !== undefined) b.withShareQuota(config.shareQuota);

    return b.build();
  };
}
