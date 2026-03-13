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

// Agent constant: INDEX_PATTERN_COMPONENT_NAME = "IndexPattern"
const INDEX_PATTERN_TYPE_NAME = 'IndexPattern';
const NAMESPACE_PARAM = 'namespace';
const PATTERN_PARAM = 'pattern';
const TIME_FIELD_PARAM = 'timeField';
const IS_DEFAULT_PARAM = 'isDefault';

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

function buildIndexPatternType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(INDEX_PATTERN_TYPE_NAME).build(),
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
export type SatisfiedIndexPatternBuilder = {
  withNamespace: (namespace: string) => SatisfiedIndexPatternBuilder;
  withPattern: (pattern: string) => SatisfiedIndexPatternBuilder;
  withTimeField: (timeField: string) => SatisfiedIndexPatternBuilder;
  withIsDefault: (isDefault: boolean) => SatisfiedIndexPatternBuilder;
  build: () => LiveSystemComponent;
};

export type IndexPatternBuilder = {
  withId: (id: string) => IndexPatternBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => IndexPatternBuilder;
  withDisplayName: (displayName: string) => IndexPatternBuilder;
  withDescription: (description: string) => IndexPatternBuilder;
  withNamespace: (namespace: string) => IndexPatternBuilder;
  withPattern: (pattern: string) => IndexPatternBuilder;
  withTimeField: (timeField: string) => IndexPatternBuilder;
  withIsDefault: (isDefault: boolean) => IndexPatternBuilder;
  build: () => LiveSystemComponent;
};

export type IndexPatternConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  pattern?: string;
  timeField?: string;
  isDefault?: boolean;
};

export namespace IndexPattern {
  export const getBuilder = (): IndexPatternBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildIndexPatternType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: IndexPatternBuilder = {
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
      withPattern: value => {
        pushParam(params, PATTERN_PARAM, value);
        return builder;
      },
      withTimeField: value => {
        pushParam(params, TIME_FIELD_PARAM, value);
        return builder;
      },
      withIsDefault: value => {
        pushParam(params, IS_DEFAULT_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedIndexPatternBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildIndexPatternType())
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

    const satisfiedBuilder: SatisfiedIndexPatternBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withPattern: value => {
        pushParam(params, PATTERN_PARAM, value);
        return satisfiedBuilder;
      },
      withTimeField: value => {
        pushParam(params, TIME_FIELD_PARAM, value);
        return satisfiedBuilder;
      },
      withIsDefault: value => {
        pushParam(params, IS_DEFAULT_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: IndexPatternConfig): LiveSystemComponent => {
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
    if (config.pattern) b.withPattern(config.pattern);
    if (config.timeField) b.withTimeField(config.timeField);
    if (config.isDefault !== undefined) b.withIsDefault(config.isDefault);

    return b.build();
  };
}
