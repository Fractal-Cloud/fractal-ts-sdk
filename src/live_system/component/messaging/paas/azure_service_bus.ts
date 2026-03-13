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

const AZURE_SERVICE_BUS_TYPE_NAME = 'ServiceBus';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const SKU_PARAM = 'sku';

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
        .withValue(AZURE_SERVICE_BUS_TYPE_NAME)
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

export type SatisfiedAzureServiceBusBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureServiceBusBuilder;
  withAzureResourceGroup: (rg: string) => SatisfiedAzureServiceBusBuilder;
  withSku: (sku: string) => SatisfiedAzureServiceBusBuilder;
  build: () => LiveSystemComponent;
};

export type AzureServiceBusBuilder = {
  withId: (id: string) => AzureServiceBusBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureServiceBusBuilder;
  withDisplayName: (displayName: string) => AzureServiceBusBuilder;
  withDescription: (description: string) => AzureServiceBusBuilder;
  withAzureRegion: (region: string) => AzureServiceBusBuilder;
  withAzureResourceGroup: (rg: string) => AzureServiceBusBuilder;
  withSku: (sku: string) => AzureServiceBusBuilder;
  build: () => LiveSystemComponent;
};

export type AzureServiceBusConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  sku?: string;
};

export namespace AzureServiceBus {
  export const getBuilder = (): AzureServiceBusBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureServiceBusBuilder = {
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
      withSku: value => {
        pushParam(params, SKU_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureServiceBusBuilder => {
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

    const satisfiedBuilder: SatisfiedAzureServiceBusBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withSku: value => {
        pushParam(params, SKU_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureServiceBusConfig,
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
    if (config.sku) b.withSku(config.sku);

    return b.build();
  };
}
