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

// Agent constant: JAEGER_COMPONENT_NAME = "Jaeger"
const JAEGER_TYPE_NAME = 'Jaeger';
export const NAMESPACE_PARAM = 'namespace';
export const STORAGE_PARAM = 'storage';
export const ELASTIC_INSTANCES_PARAM = 'elasticInstances';
export const ELASTIC_VERSION_PARAM = 'elasticVersion';

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

function buildJaegerType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Observability)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(PascalCaseString.getBuilder().withValue(JAEGER_TYPE_NAME).build())
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
export type SatisfiedJaegerBuilder = {
  withNamespace: (namespace: string) => SatisfiedJaegerBuilder;
  withStorage: (storage: string) => SatisfiedJaegerBuilder;
  withElasticInstances: (instances: number) => SatisfiedJaegerBuilder;
  withElasticVersion: (version: string) => SatisfiedJaegerBuilder;
  build: () => LiveSystemComponent;
};

export type JaegerBuilder = {
  withId: (id: string) => JaegerBuilder;
  withVersion: (major: number, minor: number, patch: number) => JaegerBuilder;
  withDisplayName: (displayName: string) => JaegerBuilder;
  withDescription: (description: string) => JaegerBuilder;
  withNamespace: (namespace: string) => JaegerBuilder;
  withStorage: (storage: string) => JaegerBuilder;
  withElasticInstances: (instances: number) => JaegerBuilder;
  withElasticVersion: (version: string) => JaegerBuilder;
  build: () => LiveSystemComponent;
};

export type JaegerConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  storage?: string;
  elasticInstances?: number;
  elasticVersion?: string;
};

export namespace Jaeger {
  export const getBuilder = (): JaegerBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildJaegerType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: JaegerBuilder = {
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
      withStorage: value => {
        pushParam(params, STORAGE_PARAM, value);
        return builder;
      },
      withElasticInstances: value => {
        pushParam(params, ELASTIC_INSTANCES_PARAM, value);
        return builder;
      },
      withElasticVersion: value => {
        pushParam(params, ELASTIC_VERSION_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedJaegerBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildJaegerType())
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

    const satisfiedBuilder: SatisfiedJaegerBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withStorage: value => {
        pushParam(params, STORAGE_PARAM, value);
        return satisfiedBuilder;
      },
      withElasticInstances: value => {
        pushParam(params, ELASTIC_INSTANCES_PARAM, value);
        return satisfiedBuilder;
      },
      withElasticVersion: value => {
        pushParam(params, ELASTIC_VERSION_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: JaegerConfig): LiveSystemComponent => {
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
    if (config.storage) b.withStorage(config.storage);
    if (config.elasticInstances !== undefined)
      b.withElasticInstances(config.elasticInstances);
    if (config.elasticVersion) b.withElasticVersion(config.elasticVersion);

    return b.build();
  };
}
