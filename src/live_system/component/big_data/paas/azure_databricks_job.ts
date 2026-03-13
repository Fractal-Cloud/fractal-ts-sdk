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
import {
  JOB_NAME_PARAM,
  TASK_TYPE_PARAM,
  NOTEBOOK_PATH_PARAM,
  PYTHON_FILE_PARAM,
  MAIN_CLASS_NAME_PARAM,
  JAR_URI_PARAM,
  PARAMETERS_PARAM,
  CRON_SCHEDULE_PARAM,
  MAX_RETRIES_PARAM,
  EXISTING_CLUSTER_PARAM,
} from '../../../../fractal/component/big_data/paas/data_processing_job';

const AZURE_DATABRICKS_JOB_TYPE_NAME = 'DatabricksJob';

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
        .withValue(AZURE_DATABRICKS_JOB_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — all job params are locked from the blueprint.
 * No Azure-specific parameters are needed, so only build() is exposed.
 */
export type SatisfiedAzureDatabricksJobBuilder = {
  build: () => LiveSystemComponent;
};

export type AzureDatabricksJobBuilder = {
  withId: (id: string) => AzureDatabricksJobBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureDatabricksJobBuilder;
  withDisplayName: (displayName: string) => AzureDatabricksJobBuilder;
  withDescription: (description: string) => AzureDatabricksJobBuilder;
  build: () => LiveSystemComponent;
};

export type AzureDatabricksJobConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

export namespace AzureDatabricksJob {
  export const getBuilder = (): AzureDatabricksJobBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureDatabricksJobBuilder = {
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
   * Satisfies a blueprint DataProcessingJob component as an Azure Databricks Job.
   * Carries id, version, displayName, dependencies, links, and all job params.
   */
  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureDatabricksJobBuilder => {
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

    // Carry all blueprint job params
    const paramKeys = [
      JOB_NAME_PARAM,
      TASK_TYPE_PARAM,
      NOTEBOOK_PATH_PARAM,
      PYTHON_FILE_PARAM,
      MAIN_CLASS_NAME_PARAM,
      JAR_URI_PARAM,
      PARAMETERS_PARAM,
      CRON_SCHEDULE_PARAM,
      MAX_RETRIES_PARAM,
      EXISTING_CLUSTER_PARAM,
    ];
    for (const key of paramKeys) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) params.push(key, val as Record<string, object>);
    }

    return {build: () => inner.build()};
  };

  export const create = (
    config: AzureDatabricksJobConfig,
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
