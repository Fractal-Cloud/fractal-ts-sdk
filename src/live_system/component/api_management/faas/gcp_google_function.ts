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
import {
  SOURCE_ARTIFACT_PARAM,
  RUNTIME_PARAM,
  ENTRY_POINT_PARAM,
} from '../../../../fractal/component/custom_workloads/faas/function';

// Agent constant: Offer type = "APIManagement.FaaS.GoogleFunction"
const GOOGLE_FUNCTION_TYPE_NAME = 'GoogleFunction';

const LOCATION_PARAM = 'location';

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
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.FaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GOOGLE_FUNCTION_TYPE_NAME)
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
 * Structural properties and the unified function params are locked to the
 * blueprint and cannot be overridden.
 */
export type SatisfiedGoogleFunctionBuilder = {
  withLocation: (location: string) => SatisfiedGoogleFunctionBuilder;
  withRuntime: (runtime: string) => SatisfiedGoogleFunctionBuilder;
  withEntryPoint: (entryPoint: string) => SatisfiedGoogleFunctionBuilder;
  build: () => LiveSystemComponent;
};

export type GoogleFunctionBuilder = {
  withId: (id: string) => GoogleFunctionBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GoogleFunctionBuilder;
  withDisplayName: (displayName: string) => GoogleFunctionBuilder;
  withDescription: (description: string) => GoogleFunctionBuilder;
  withSourceArtifact: (sourceArtifact: string) => GoogleFunctionBuilder;
  withLocation: (location: string) => GoogleFunctionBuilder;
  withRuntime: (runtime: string) => GoogleFunctionBuilder;
  withEntryPoint: (entryPoint: string) => GoogleFunctionBuilder;
  build: () => LiveSystemComponent;
};

export type GoogleFunctionConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  sourceArtifact: string;
  location?: string;
  runtime?: string;
  entryPoint: string;
};

export namespace GoogleFunction {
  export const getBuilder = (): GoogleFunctionBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GoogleFunctionBuilder = {
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
      withSourceArtifact: value => {
        pushParam(params, SOURCE_ARTIFACT_PARAM, value);
        return builder;
      },
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return builder;
      },
      withRuntime: value => {
        pushParam(params, RUNTIME_PARAM, value);
        return builder;
      },
      withEntryPoint: value => {
        pushParam(params, ENTRY_POINT_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Function component as a GCP Google Function.
   * Carries id, version, displayName, dependencies, links, and the unified
   * function params (sourceArtifact, runtime, entryPoint). Vendor-specific
   * params (location) are added via the sealed builder.
   */
  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGoogleFunctionBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
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

    // Carry the unified function params straight through.
    const paramKeys = [SOURCE_ARTIFACT_PARAM, RUNTIME_PARAM, ENTRY_POINT_PARAM];
    for (const key of paramKeys) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) params.push(key, val as Record<string, object>);
    }

    const satisfiedBuilder: SatisfiedGoogleFunctionBuilder = {
      withLocation: value => {
        pushParam(params, LOCATION_PARAM, value);
        return satisfiedBuilder;
      },
      withRuntime: value => {
        pushParam(params, RUNTIME_PARAM, value);
        return satisfiedBuilder;
      },
      withEntryPoint: value => {
        pushParam(params, ENTRY_POINT_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GoogleFunctionConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withSourceArtifact(config.sourceArtifact)
      .withEntryPoint(config.entryPoint);

    if (config.description) b.withDescription(config.description);
    if (config.location) b.withLocation(config.location);
    if (config.runtime) b.withRuntime(config.runtime);

    return b.build();
  };
}
