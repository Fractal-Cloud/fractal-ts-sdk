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
import {EXPERIMENT_NAME_PARAM} from '../../../../fractal/component/big_data/paas/ml_experiment';

const ARTIFACT_LOCATION_PARAM = 'artifactLocation';

// Agent constant: DATABRICKS_MLFLOW_EXPERIMENT_COMPONENT_NAME = "DatabricksMlflowExperiment"
const AWS_DATABRICKS_MLFLOW_TYPE_NAME = 'DatabricksMlflowExperiment';

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

function buildAwsDatabricksMlflowType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_DATABRICKS_MLFLOW_TYPE_NAME)
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
 * Returned by satisfy() — blueprint params are locked.
 * artifactLocation is vendor-specific and set via the sealed builder.
 */
export type SatisfiedAwsDatabricksMlflowBuilder = {
  withArtifactLocation: (
    location: string,
  ) => SatisfiedAwsDatabricksMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type AwsDatabricksMlflowBuilder = {
  withId: (id: string) => AwsDatabricksMlflowBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsDatabricksMlflowBuilder;
  withDisplayName: (displayName: string) => AwsDatabricksMlflowBuilder;
  withDescription: (description: string) => AwsDatabricksMlflowBuilder;
  withExperimentName: (name: string) => AwsDatabricksMlflowBuilder;
  withArtifactLocation: (location: string) => AwsDatabricksMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type AwsDatabricksMlflowConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  experimentName?: string;
  artifactLocation?: string;
};

export namespace AwsDatabricksMlflow {
  export const getBuilder = (): AwsDatabricksMlflowBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksMlflowType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsDatabricksMlflowBuilder = {
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
      withExperimentName: name => {
        pushParam(params, EXPERIMENT_NAME_PARAM, name);
        return builder;
      },
      withArtifactLocation: location => {
        pushParam(params, ARTIFACT_LOCATION_PARAM, location);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsDatabricksMlflowBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksMlflowType())
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

    // Carry blueprint params (experimentName only; artifactLocation is vendor-specific)
    for (const key of [EXPERIMENT_NAME_PARAM]) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) pushParam(params, key, val);
    }

    const satisfiedBuilder: SatisfiedAwsDatabricksMlflowBuilder = {
      withArtifactLocation: location => {
        pushParam(params, ARTIFACT_LOCATION_PARAM, location);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AwsDatabricksMlflowConfig,
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
    if (config.experimentName) b.withExperimentName(config.experimentName);
    if (config.artifactLocation)
      b.withArtifactLocation(config.artifactLocation);

    return b.build();
  };
}
