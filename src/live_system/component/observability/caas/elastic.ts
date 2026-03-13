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

// Agent constant: ELASTIC_COMPONENT_NAME = "Elastic"
const ELASTIC_TYPE_NAME = 'Elastic';
export const NAMESPACE_PARAM = 'namespace';
export const ELASTIC_VERSION_PARAM = 'elasticVersion';
export const ELASTIC_INSTANCES_PARAM = 'elasticInstances';
export const STORAGE_PARAM = 'storage';
export const IS_APM_REQUIRED_PARAM = 'isApmRequired';
export const IS_KIBANA_REQUIRED_PARAM = 'isKibanaRequired';

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

function buildElasticType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Observability)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ELASTIC_TYPE_NAME).build(),
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
export type SatisfiedObservabilityElasticBuilder = {
  withNamespace: (namespace: string) => SatisfiedObservabilityElasticBuilder;
  withElasticVersion: (version: string) => SatisfiedObservabilityElasticBuilder;
  withElasticInstances: (
    instances: number,
  ) => SatisfiedObservabilityElasticBuilder;
  withStorage: (storage: string) => SatisfiedObservabilityElasticBuilder;
  withIsApmRequired: (
    required: boolean,
  ) => SatisfiedObservabilityElasticBuilder;
  withIsKibanaRequired: (
    required: boolean,
  ) => SatisfiedObservabilityElasticBuilder;
  build: () => LiveSystemComponent;
};

export type ObservabilityElasticBuilder = {
  withId: (id: string) => ObservabilityElasticBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ObservabilityElasticBuilder;
  withDisplayName: (displayName: string) => ObservabilityElasticBuilder;
  withDescription: (description: string) => ObservabilityElasticBuilder;
  withNamespace: (namespace: string) => ObservabilityElasticBuilder;
  withElasticVersion: (version: string) => ObservabilityElasticBuilder;
  withElasticInstances: (instances: number) => ObservabilityElasticBuilder;
  withStorage: (storage: string) => ObservabilityElasticBuilder;
  withIsApmRequired: (required: boolean) => ObservabilityElasticBuilder;
  withIsKibanaRequired: (required: boolean) => ObservabilityElasticBuilder;
  build: () => LiveSystemComponent;
};

export type ObservabilityElasticConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  elasticVersion?: string;
  elasticInstances?: number;
  storage?: string;
  isApmRequired?: boolean;
  isKibanaRequired?: boolean;
};

export namespace ObservabilityElastic {
  export const getBuilder = (): ObservabilityElasticBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildElasticType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: ObservabilityElasticBuilder = {
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
      withElasticVersion: value => {
        pushParam(params, ELASTIC_VERSION_PARAM, value);
        return builder;
      },
      withElasticInstances: value => {
        pushParam(params, ELASTIC_INSTANCES_PARAM, value);
        return builder;
      },
      withStorage: value => {
        pushParam(params, STORAGE_PARAM, value);
        return builder;
      },
      withIsApmRequired: value => {
        pushParam(params, IS_APM_REQUIRED_PARAM, value);
        return builder;
      },
      withIsKibanaRequired: value => {
        pushParam(params, IS_KIBANA_REQUIRED_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedObservabilityElasticBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildElasticType())
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

    const satisfiedBuilder: SatisfiedObservabilityElasticBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withElasticVersion: value => {
        pushParam(params, ELASTIC_VERSION_PARAM, value);
        return satisfiedBuilder;
      },
      withElasticInstances: value => {
        pushParam(params, ELASTIC_INSTANCES_PARAM, value);
        return satisfiedBuilder;
      },
      withStorage: value => {
        pushParam(params, STORAGE_PARAM, value);
        return satisfiedBuilder;
      },
      withIsApmRequired: value => {
        pushParam(params, IS_APM_REQUIRED_PARAM, value);
        return satisfiedBuilder;
      },
      withIsKibanaRequired: value => {
        pushParam(params, IS_KIBANA_REQUIRED_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: ObservabilityElasticConfig,
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
    if (config.namespace) b.withNamespace(config.namespace);
    if (config.elasticVersion) b.withElasticVersion(config.elasticVersion);
    if (config.elasticInstances !== undefined)
      b.withElasticInstances(config.elasticInstances);
    if (config.storage) b.withStorage(config.storage);
    if (config.isApmRequired !== undefined)
      b.withIsApmRequired(config.isApmRequired);
    if (config.isKibanaRequired !== undefined)
      b.withIsKibanaRequired(config.isKibanaRequired);

    return b.build();
  };
}
