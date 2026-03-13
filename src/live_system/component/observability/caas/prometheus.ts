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

// Agent constant: PROMETHEUS_COMPONENT_NAME = "Prometheus"
const PROMETHEUS_TYPE_NAME = 'Prometheus';
export const NAMESPACE_PARAM = 'namespace';
export const API_GATEWAY_URL_PARAM = 'apiGatewayUrl';

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

function buildPrometheusType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Observability)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(PROMETHEUS_TYPE_NAME).build(),
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
export type SatisfiedPrometheusBuilder = {
  withNamespace: (namespace: string) => SatisfiedPrometheusBuilder;
  withApiGatewayUrl: (url: string) => SatisfiedPrometheusBuilder;
  build: () => LiveSystemComponent;
};

export type PrometheusBuilder = {
  withId: (id: string) => PrometheusBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => PrometheusBuilder;
  withDisplayName: (displayName: string) => PrometheusBuilder;
  withDescription: (description: string) => PrometheusBuilder;
  withNamespace: (namespace: string) => PrometheusBuilder;
  withApiGatewayUrl: (url: string) => PrometheusBuilder;
  build: () => LiveSystemComponent;
};

export type PrometheusConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  apiGatewayUrl?: string;
};

export namespace Prometheus {
  export const getBuilder = (): PrometheusBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildPrometheusType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: PrometheusBuilder = {
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
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return builder;
      },
      withApiGatewayUrl: value => {
        pushParam(params, API_GATEWAY_URL_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedPrometheusBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildPrometheusType())
      .withParameters(params)
      .withProvider('CaaS')
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

    const satisfiedBuilder: SatisfiedPrometheusBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withApiGatewayUrl: value => {
        pushParam(params, API_GATEWAY_URL_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: PrometheusConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.namespace) b.withNamespace(config.namespace);
    if (config.apiGatewayUrl) b.withApiGatewayUrl(config.apiGatewayUrl);

    return b.build();
  };
}
