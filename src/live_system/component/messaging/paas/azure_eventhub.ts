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

const AZURE_EVENTHUB_TYPE_NAME = 'EventHub';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const PARTITION_COUNT_PARAM = 'partitionCount';
const MESSAGE_RETENTION_IN_DAYS_PARAM = 'messageRetentionInDays';

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
      PascalCaseString.getBuilder().withValue(AZURE_EVENTHUB_TYPE_NAME).build(),
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

export type SatisfiedAzureEventHubBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureEventHubBuilder;
  withAzureResourceGroup: (rg: string) => SatisfiedAzureEventHubBuilder;
  withPartitionCount: (count: number) => SatisfiedAzureEventHubBuilder;
  withMessageRetentionInDays: (days: number) => SatisfiedAzureEventHubBuilder;
  build: () => LiveSystemComponent;
};

export type AzureEventHubBuilder = {
  withId: (id: string) => AzureEventHubBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureEventHubBuilder;
  withDisplayName: (displayName: string) => AzureEventHubBuilder;
  withDescription: (description: string) => AzureEventHubBuilder;
  withAzureRegion: (region: string) => AzureEventHubBuilder;
  withAzureResourceGroup: (rg: string) => AzureEventHubBuilder;
  withPartitionCount: (count: number) => AzureEventHubBuilder;
  withMessageRetentionInDays: (days: number) => AzureEventHubBuilder;
  build: () => LiveSystemComponent;
};

export type AzureEventHubConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  partitionCount?: number;
  messageRetentionInDays?: number;
};

export namespace AzureEventHub {
  export const getBuilder = (): AzureEventHubBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureEventHubBuilder = {
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
      withPartitionCount: value => {
        pushParam(params, PARTITION_COUNT_PARAM, value);
        return builder;
      },
      withMessageRetentionInDays: value => {
        pushParam(params, MESSAGE_RETENTION_IN_DAYS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureEventHubBuilder => {
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

    const satisfiedBuilder: SatisfiedAzureEventHubBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withPartitionCount: value => {
        pushParam(params, PARTITION_COUNT_PARAM, value);
        return satisfiedBuilder;
      },
      withMessageRetentionInDays: value => {
        pushParam(params, MESSAGE_RETENTION_IN_DAYS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AzureEventHubConfig): LiveSystemComponent => {
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
    if (config.partitionCount !== undefined)
      b.withPartitionCount(config.partitionCount);
    if (config.messageRetentionInDays !== undefined)
      b.withMessageRetentionInDays(config.messageRetentionInDays);

    return b.build();
  };
}
