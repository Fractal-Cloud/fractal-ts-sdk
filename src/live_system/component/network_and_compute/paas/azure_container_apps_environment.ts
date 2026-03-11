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

// Agent constant: AZURE_CONTAINER_APPS_ENVIRONMENT_COMPONENT_NAME = "AzureContainerAppsEnvironment"
const AZURE_CONTAINER_APPS_ENV_TYPE_NAME = 'AzureContainerAppsEnvironment';

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

function buildAzureContainerAppsEnvType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_CONTAINER_APPS_ENV_TYPE_NAME)
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

export type SatisfiedAzureContainerAppsEnvironmentBuilder = {
  withLocation: (
    location: string,
  ) => SatisfiedAzureContainerAppsEnvironmentBuilder;
  withResourceGroup: (
    resourceGroup: string,
  ) => SatisfiedAzureContainerAppsEnvironmentBuilder;
  withLogAnalyticsWorkspaceId: (
    id: string,
  ) => SatisfiedAzureContainerAppsEnvironmentBuilder;
  withLogAnalyticsSharedKey: (
    key: string,
  ) => SatisfiedAzureContainerAppsEnvironmentBuilder;
  build: () => LiveSystemComponent;
};

export type AzureContainerAppsEnvironmentBuilder = {
  withId: (id: string) => AzureContainerAppsEnvironmentBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureContainerAppsEnvironmentBuilder;
  withDisplayName: (
    displayName: string,
  ) => AzureContainerAppsEnvironmentBuilder;
  withDescription: (
    description: string,
  ) => AzureContainerAppsEnvironmentBuilder;
  withLocation: (location: string) => AzureContainerAppsEnvironmentBuilder;
  withResourceGroup: (
    resourceGroup: string,
  ) => AzureContainerAppsEnvironmentBuilder;
  withLogAnalyticsWorkspaceId: (
    id: string,
  ) => AzureContainerAppsEnvironmentBuilder;
  withLogAnalyticsSharedKey: (
    key: string,
  ) => AzureContainerAppsEnvironmentBuilder;
  build: () => LiveSystemComponent;
};

export type AzureContainerAppsEnvironmentConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  location: string;
  resourceGroup: string;
  logAnalyticsWorkspaceId?: string;
  logAnalyticsSharedKey?: string;
};

export namespace AzureContainerAppsEnvironment {
  export const getBuilder = (): AzureContainerAppsEnvironmentBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureContainerAppsEnvType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureContainerAppsEnvironmentBuilder = {
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
      withLocation: location => {
        pushParam(params, 'location', location);
        return builder;
      },
      withResourceGroup: resourceGroup => {
        pushParam(params, 'resourceGroup', resourceGroup);
        return builder;
      },
      withLogAnalyticsWorkspaceId: id => {
        pushParam(params, 'logAnalyticsWorkspaceId', id);
        return builder;
      },
      withLogAnalyticsSharedKey: key => {
        pushParam(params, 'logAnalyticsSharedKey', key);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint ContainerPlatform component as an Azure Container
   * Apps Environment. Carries id, version, displayName, and description from
   * the blueprint. Location and resourceGroup are Azure-specific and required.
   *
   * Dependencies declared in the blueprint (e.g. optional subnet for VNet
   * integration) are carried automatically.
   */
  export const satisfy = (
    platform: BlueprintComponent,
  ): SatisfiedAzureContainerAppsEnvironmentBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAzureContainerAppsEnvType())
      .withParameters(params)
      .withProvider('Azure')
      .withId(buildId(platform.id.toString()))
      .withVersion(
        buildVersion(
          platform.version.major,
          platform.version.minor,
          platform.version.patch,
        ),
      )
      .withDisplayName(platform.displayName)
      .withDependencies(platform.dependencies);

    if (platform.description) inner.withDescription(platform.description);

    const satisfiedBuilder: SatisfiedAzureContainerAppsEnvironmentBuilder = {
      withLocation: location => {
        pushParam(params, 'location', location);
        return satisfiedBuilder;
      },
      withResourceGroup: resourceGroup => {
        pushParam(params, 'resourceGroup', resourceGroup);
        return satisfiedBuilder;
      },
      withLogAnalyticsWorkspaceId: id => {
        pushParam(params, 'logAnalyticsWorkspaceId', id);
        return satisfiedBuilder;
      },
      withLogAnalyticsSharedKey: key => {
        pushParam(params, 'logAnalyticsSharedKey', key);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureContainerAppsEnvironmentConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withLocation(config.location)
      .withResourceGroup(config.resourceGroup);

    if (config.description) b.withDescription(config.description);
    if (config.logAnalyticsWorkspaceId)
      b.withLogAnalyticsWorkspaceId(config.logAnalyticsWorkspaceId);
    if (config.logAnalyticsSharedKey)
      b.withLogAnalyticsSharedKey(config.logAnalyticsSharedKey);

    return b.build();
  };
}
