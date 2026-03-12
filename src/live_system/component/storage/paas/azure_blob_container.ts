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

const AZURE_BLOB_CONTAINER_TYPE_NAME = 'StorageBlobContainer';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const PUBLIC_ACCESS_PARAM = 'publicAccess';

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
        .withValue(AZURE_BLOB_CONTAINER_TYPE_NAME)
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

export type SatisfiedAzureBlobContainerBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureBlobContainerBuilder;
  withAzureResourceGroup: (rg: string) => SatisfiedAzureBlobContainerBuilder;
  withPublicAccess: (
    publicAccess: string,
  ) => SatisfiedAzureBlobContainerBuilder;
  build: () => LiveSystemComponent;
};

export type AzureBlobContainerBuilder = {
  withId: (id: string) => AzureBlobContainerBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureBlobContainerBuilder;
  withDisplayName: (displayName: string) => AzureBlobContainerBuilder;
  withDescription: (description: string) => AzureBlobContainerBuilder;
  withAzureRegion: (region: string) => AzureBlobContainerBuilder;
  withAzureResourceGroup: (rg: string) => AzureBlobContainerBuilder;
  withPublicAccess: (publicAccess: string) => AzureBlobContainerBuilder;
  build: () => LiveSystemComponent;
};

export type AzureBlobContainerConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  publicAccess?: string;
};

export namespace AzureBlobContainer {
  export const getBuilder = (): AzureBlobContainerBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureBlobContainerBuilder = {
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
      withPublicAccess: value => {
        pushParam(params, PUBLIC_ACCESS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureBlobContainerBuilder => {
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

    const satisfiedBuilder: SatisfiedAzureBlobContainerBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withPublicAccess: value => {
        pushParam(params, PUBLIC_ACCESS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureBlobContainerConfig,
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
    if (config.publicAccess) b.withPublicAccess(config.publicAccess);

    return b.build();
  };
}
