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

// Agent constant: API_GATEWAY_COMPONENT_NAME = "ApiGateway"
const GCP_API_GATEWAY_TYPE_NAME = 'ApiGateway';
export const REGION_PARAM = 'region';
export const NAME_PARAM = 'name';
export const API_ID_PARAM = 'apiId';
export const API_CONFIG_ID_PARAM = 'apiConfigId';

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

function buildGcpApiGatewayType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_API_GATEWAY_TYPE_NAME)
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

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedGcpApiGatewayBuilder = {
  withRegion: (region: string) => SatisfiedGcpApiGatewayBuilder;
  withName: (name: string) => SatisfiedGcpApiGatewayBuilder;
  withApiId: (apiId: string) => SatisfiedGcpApiGatewayBuilder;
  withApiConfigId: (configId: string) => SatisfiedGcpApiGatewayBuilder;
  build: () => LiveSystemComponent;
};

export type GcpApiGatewayBuilder = {
  withId: (id: string) => GcpApiGatewayBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpApiGatewayBuilder;
  withDisplayName: (displayName: string) => GcpApiGatewayBuilder;
  withDescription: (description: string) => GcpApiGatewayBuilder;
  withRegion: (region: string) => GcpApiGatewayBuilder;
  withName: (name: string) => GcpApiGatewayBuilder;
  withApiId: (apiId: string) => GcpApiGatewayBuilder;
  withApiConfigId: (configId: string) => GcpApiGatewayBuilder;
  build: () => LiveSystemComponent;
};

export type GcpApiGatewayConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  region?: string;
  name?: string;
  apiId?: string;
  apiConfigId?: string;
};

export namespace GcpApiGateway {
  export const getBuilder = (): GcpApiGatewayBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpApiGatewayType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpApiGatewayBuilder = {
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
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return builder;
      },
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return builder;
      },
      withApiId: value => {
        pushParam(params, API_ID_PARAM, value);
        return builder;
      },
      withApiConfigId: value => {
        pushParam(params, API_CONFIG_ID_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpApiGatewayBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpApiGatewayType())
      .withParameters(params)
      .withProvider('GCP')
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

    const satisfiedBuilder: SatisfiedGcpApiGatewayBuilder = {
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withApiId: value => {
        pushParam(params, API_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withApiConfigId: value => {
        pushParam(params, API_CONFIG_ID_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpApiGatewayConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.region) b.withRegion(config.region);
    if (config.name) b.withName(config.name);
    if (config.apiId) b.withApiId(config.apiId);
    if (config.apiConfigId) b.withApiConfigId(config.apiConfigId);

    return b.build();
  };
}
