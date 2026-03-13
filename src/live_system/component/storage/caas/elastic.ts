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
const NAMESPACE_PARAM = 'namespace';
const ELASTIC_VERSION_PARAM = 'elasticVersion';
const ELASTIC_INSTANCES_PARAM = 'elasticInstances';
const STORAGE_PARAM = 'storage';

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
    .withInfrastructureDomain(InfrastructureDomain.Storage)
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
export type SatisfiedElasticBuilder = {
  withNamespace: (namespace: string) => SatisfiedElasticBuilder;
  withElasticVersion: (version: string) => SatisfiedElasticBuilder;
  withElasticInstances: (instances: number) => SatisfiedElasticBuilder;
  withStorage: (storage: string) => SatisfiedElasticBuilder;
  build: () => LiveSystemComponent;
};

export type ElasticBuilder = {
  withId: (id: string) => ElasticBuilder;
  withVersion: (major: number, minor: number, patch: number) => ElasticBuilder;
  withDisplayName: (displayName: string) => ElasticBuilder;
  withDescription: (description: string) => ElasticBuilder;
  withNamespace: (namespace: string) => ElasticBuilder;
  withElasticVersion: (version: string) => ElasticBuilder;
  withElasticInstances: (instances: number) => ElasticBuilder;
  withStorage: (storage: string) => ElasticBuilder;
  build: () => LiveSystemComponent;
};

export type ElasticConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  elasticVersion?: string;
  elasticInstances?: number;
  storage?: string;
};

export namespace Elastic {
  export const getBuilder = (): ElasticBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildElasticType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: ElasticBuilder = {
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
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedElasticBuilder => {
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

    const satisfiedBuilder: SatisfiedElasticBuilder = {
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
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: ElasticConfig): LiveSystemComponent => {
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

    return b.build();
  };
}
