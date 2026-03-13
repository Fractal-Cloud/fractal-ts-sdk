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
import {EXPERIMENT_NAME_PARAM} from '../../../../fractal/component/big_data/paas/ml_experiment';

const ARTIFACT_LOCATION_PARAM = 'artifactLocation';

// Agent constant: DATABRICKS_MLFLOW_EXPERIMENT_COMPONENT_NAME = "DatabricksMlflowExperiment"
const DATABRICKS_MLFLOW_EXPERIMENT_TYPE_NAME = 'DatabricksMlflowExperiment';

// -- internal helpers ----------------------------------------------------------

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
        .withValue(DATABRICKS_MLFLOW_EXPERIMENT_TYPE_NAME)
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

// -- Public API ----------------------------------------------------------------

/**
 * Returned by satisfy() — blueprint params are locked.
 * artifactLocation is vendor-specific and set via the sealed builder.
 */
export type SatisfiedGcpDatabricksMlflowBuilder = {
  withArtifactLocation: (
    location: string,
  ) => SatisfiedGcpDatabricksMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type GcpDatabricksMlflowBuilder = {
  withId: (id: string) => GcpDatabricksMlflowBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpDatabricksMlflowBuilder;
  withDisplayName: (displayName: string) => GcpDatabricksMlflowBuilder;
  withDescription: (description: string) => GcpDatabricksMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type GcpDatabricksMlflowConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace GcpDatabricksMlflow {
  export const getBuilder = (): GcpDatabricksMlflowBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpDatabricksMlflowBuilder = {
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
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpDatabricksMlflowBuilder => {
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

    // Carry blueprint params (experimentName only; artifactLocation is vendor-specific)
    const experimentName = blueprint.parameters.getOptionalFieldByName(
      EXPERIMENT_NAME_PARAM,
    );
    if (experimentName !== null)
      pushParam(params, EXPERIMENT_NAME_PARAM, experimentName);

    const satisfiedBuilder: SatisfiedGcpDatabricksMlflowBuilder = {
      withArtifactLocation: location => {
        pushParam(params, ARTIFACT_LOCATION_PARAM, location);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: GcpDatabricksMlflowConfig,
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

    return b.build();
  };
}
