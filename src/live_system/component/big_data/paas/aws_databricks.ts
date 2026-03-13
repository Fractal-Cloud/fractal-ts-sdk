import {getLiveSystemComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../../../fractal/component/type';
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

// Agent constant: DATABRICKS_COMPONENT_NAME = "Databricks"
const AWS_DATABRICKS_TYPE_NAME = 'Databricks';
const CREDENTIALS_ID_PARAM = 'credentialsId';
const STORAGE_CONFIGURATION_ID_PARAM = 'storageConfigurationId';
const NETWORK_ID_PARAM = 'networkId';

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

function buildAwsDatabricksType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_DATABRICKS_TYPE_NAME).build(),
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
export type SatisfiedAwsDatabricksBuilder = {
  withCredentialsId: (id: string) => SatisfiedAwsDatabricksBuilder;
  withStorageConfigurationId: (id: string) => SatisfiedAwsDatabricksBuilder;
  withNetworkId: (id: string) => SatisfiedAwsDatabricksBuilder;
  build: () => LiveSystemComponent;
};

export type AwsDatabricksBuilder = {
  withId: (id: string) => AwsDatabricksBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsDatabricksBuilder;
  withDisplayName: (displayName: string) => AwsDatabricksBuilder;
  withDescription: (description: string) => AwsDatabricksBuilder;
  withPricingTier: (tier: string) => AwsDatabricksBuilder;
  withCredentialsId: (id: string) => AwsDatabricksBuilder;
  withStorageConfigurationId: (id: string) => AwsDatabricksBuilder;
  withNetworkId: (id: string) => AwsDatabricksBuilder;
  build: () => LiveSystemComponent;
};

export type AwsDatabricksConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  pricingTier?: string;
  credentialsId?: string;
  storageConfigurationId?: string;
  networkId?: string;
};

export namespace AwsDatabricks {
  export const getBuilder = (): AwsDatabricksBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsDatabricksBuilder = {
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
      withPricingTier: tier => {
        pushParam(params, PRICING_TIER_PARAM, tier);
        return builder;
      },
      withCredentialsId: id => {
        pushParam(params, CREDENTIALS_ID_PARAM, id);
        return builder;
      },
      withStorageConfigurationId: id => {
        pushParam(params, STORAGE_CONFIGURATION_ID_PARAM, id);
        return builder;
      },
      withNetworkId: id => {
        pushParam(params, NETWORK_ID_PARAM, id);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsDatabricksBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksType())
      .withParameters(params)
      .withProvider('AWS')
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
    const val = blueprint.parameters.getOptionalFieldByName(PRICING_TIER_PARAM);
    if (val !== null) pushParam(params, PRICING_TIER_PARAM, val);

    const satisfiedBuilder: SatisfiedAwsDatabricksBuilder = {
      withCredentialsId: id => {
        pushParam(params, CREDENTIALS_ID_PARAM, id);
        return satisfiedBuilder;
      },
      withStorageConfigurationId: id => {
        pushParam(params, STORAGE_CONFIGURATION_ID_PARAM, id);
        return satisfiedBuilder;
      },
      withNetworkId: id => {
        pushParam(params, NETWORK_ID_PARAM, id);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsDatabricksConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.pricingTier) b.withPricingTier(config.pricingTier);
    if (config.credentialsId) b.withCredentialsId(config.credentialsId);
    if (config.storageConfigurationId)
      b.withStorageConfigurationId(config.storageConfigurationId);
    if (config.networkId) b.withNetworkId(config.networkId);

    return b.build();
  };
}
