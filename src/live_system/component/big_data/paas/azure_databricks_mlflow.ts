import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {LiveSystemComponent} from '../../index';
import {BlueprintComponent} from '../../../../fractal/component/index';
import {EXPERIMENT_NAME_PARAM} from '../../../../fractal/component/big_data/paas/ml_experiment';

const ARTIFACT_LOCATION_PARAM = 'artifactLocation';

const AZURE_DATABRICKS_MLFLOW_TYPE_NAME = 'DatabricksMlflowExperiment';

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
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AZURE_DATABRICKS_MLFLOW_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — blueprint params are locked.
 * artifactLocation is vendor-specific and set via the sealed builder.
 */
export type SatisfiedAzureDatabricksMlflowBuilder = {
  withArtifactLocation: (
    location: string,
  ) => SatisfiedAzureDatabricksMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type AzureDatabricksMlflowBuilder = {
  withId: (id: string) => AzureDatabricksMlflowBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureDatabricksMlflowBuilder;
  withDisplayName: (displayName: string) => AzureDatabricksMlflowBuilder;
  withDescription: (description: string) => AzureDatabricksMlflowBuilder;
  build: () => LiveSystemComponent;
};

export type AzureDatabricksMlflowConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace AzureDatabricksMlflow {
  export const getBuilder = (): AzureDatabricksMlflowBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureDatabricksMlflowBuilder = {
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

  /**
   * Satisfies a blueprint MlExperiment component as an Azure Databricks MLflow Experiment.
   * Carries id, version, displayName, dependencies, links, and experiment params.
   */
  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureDatabricksMlflowBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure')
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
    const paramKeys = [EXPERIMENT_NAME_PARAM];
    for (const key of paramKeys) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) params.push(key, val as Record<string, object>);
    }

    const satisfiedBuilder: SatisfiedAzureDatabricksMlflowBuilder = {
      withArtifactLocation: location => {
        params.push(
          ARTIFACT_LOCATION_PARAM,
          location as unknown as Record<string, object>,
        );
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureDatabricksMlflowConfig,
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
