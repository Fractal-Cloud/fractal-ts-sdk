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
import {PRICING_TIER_PARAM} from '../../../../fractal/component/big_data/paas/distributed_data_processing';

const AZURE_DATABRICKS_TYPE_NAME = 'Databricks';
const MANAGED_RESOURCE_GROUP_NAME_PARAM = 'managedResourceGroupName';
const ENABLE_NO_PUBLIC_IP_PARAM = 'enableNoPublicIp';

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
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_DATABRICKS_TYPE_NAME)
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

export type SatisfiedAzureDatabricksBuilder = {
  withManagedResourceGroupName: (
    name: string,
  ) => SatisfiedAzureDatabricksBuilder;
  withEnableNoPublicIp: (enable: boolean) => SatisfiedAzureDatabricksBuilder;
  build: () => LiveSystemComponent;
};

export type AzureDatabricksBuilder = {
  withId: (id: string) => AzureDatabricksBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureDatabricksBuilder;
  withDisplayName: (displayName: string) => AzureDatabricksBuilder;
  withDescription: (description: string) => AzureDatabricksBuilder;
  withManagedResourceGroupName: (name: string) => AzureDatabricksBuilder;
  withEnableNoPublicIp: (enable: boolean) => AzureDatabricksBuilder;
  build: () => LiveSystemComponent;
};

export type AzureDatabricksConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  managedResourceGroupName?: string;
  enableNoPublicIp?: boolean;
};

export namespace AzureDatabricks {
  export const getBuilder = (): AzureDatabricksBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureDatabricksBuilder = {
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
      withManagedResourceGroupName: value => {
        pushParam(params, MANAGED_RESOURCE_GROUP_NAME_PARAM, value);
        return builder;
      },
      withEnableNoPublicIp: value => {
        pushParam(params, ENABLE_NO_PUBLIC_IP_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureDatabricksBuilder => {
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

    // Carry blueprint params
    const pricingTier =
      blueprint.parameters.getOptionalFieldByName(PRICING_TIER_PARAM);
    if (pricingTier !== null)
      pushParam(params, PRICING_TIER_PARAM, pricingTier);

    const satisfiedBuilder: SatisfiedAzureDatabricksBuilder = {
      withManagedResourceGroupName: value => {
        pushParam(params, MANAGED_RESOURCE_GROUP_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withEnableNoPublicIp: value => {
        pushParam(params, ENABLE_NO_PUBLIC_IP_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureDatabricksConfig,
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
    if (config.managedResourceGroupName)
      b.withManagedResourceGroupName(config.managedResourceGroupName);
    if (config.enableNoPublicIp !== undefined)
      b.withEnableNoPublicIp(config.enableNoPublicIp);

    return b.build();
  };
}
