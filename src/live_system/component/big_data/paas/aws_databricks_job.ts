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

// Agent constant: DATABRICKS_JOB_COMPONENT_NAME = "DatabricksJob"
const AWS_DATABRICKS_JOB_TYPE_NAME = 'DatabricksJob';

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

function buildAwsDatabricksJobType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_DATABRICKS_JOB_TYPE_NAME)
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
 * Returned by satisfy() — all blueprint params are locked.
 * No vendor-specific parameters for DatabricksJob.
 */
export type SatisfiedAwsDatabricksJobBuilder = {
  build: () => LiveSystemComponent;
};

export type AwsDatabricksJobBuilder = {
  withId: (id: string) => AwsDatabricksJobBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsDatabricksJobBuilder;
  withDisplayName: (displayName: string) => AwsDatabricksJobBuilder;
  withDescription: (description: string) => AwsDatabricksJobBuilder;
  withJobName: (name: string) => AwsDatabricksJobBuilder;
  withTaskType: (taskType: string) => AwsDatabricksJobBuilder;
  withNotebookPath: (path: string) => AwsDatabricksJobBuilder;
  withPythonFile: (file: string) => AwsDatabricksJobBuilder;
  withMainClassName: (className: string) => AwsDatabricksJobBuilder;
  withJarUri: (uri: string) => AwsDatabricksJobBuilder;
  withParameters: (params: string[]) => AwsDatabricksJobBuilder;
  withCronSchedule: (cron: string) => AwsDatabricksJobBuilder;
  withMaxRetries: (retries: number) => AwsDatabricksJobBuilder;
  withExistingCluster: (useExisting: boolean) => AwsDatabricksJobBuilder;
  build: () => LiveSystemComponent;
};

export type AwsDatabricksJobConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  jobName?: string;
  taskType?: string;
  notebookPath?: string;
  pythonFile?: string;
  mainClassName?: string;
  jarUri?: string;
  parameters?: string[];
  cronSchedule?: string;
  maxRetries?: number;
  existingCluster?: boolean;
};

export namespace AwsDatabricksJob {
  export const getBuilder = (): AwsDatabricksJobBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksJobType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsDatabricksJobBuilder = {
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
      withJobName: name => {
        pushParam(params, JOB_NAME_PARAM, name);
        return builder;
      },
      withTaskType: taskType => {
        pushParam(params, TASK_TYPE_PARAM, taskType);
        return builder;
      },
      withNotebookPath: path => {
        pushParam(params, NOTEBOOK_PATH_PARAM, path);
        return builder;
      },
      withPythonFile: file => {
        pushParam(params, PYTHON_FILE_PARAM, file);
        return builder;
      },
      withMainClassName: className => {
        pushParam(params, MAIN_CLASS_NAME_PARAM, className);
        return builder;
      },
      withJarUri: uri => {
        pushParam(params, JAR_URI_PARAM, uri);
        return builder;
      },
      withParameters: p => {
        pushParam(params, PARAMETERS_PARAM, p);
        return builder;
      },
      withCronSchedule: cron => {
        pushParam(params, CRON_SCHEDULE_PARAM, cron);
        return builder;
      },
      withMaxRetries: retries => {
        pushParam(params, MAX_RETRIES_PARAM, retries);
        return builder;
      },
      withExistingCluster: useExisting => {
        pushParam(params, EXISTING_CLUSTER_PARAM, useExisting);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsDatabricksJobBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsDatabricksJobType())
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

    // Carry all blueprint params
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
      if (val !== null) pushParam(params, key, val);
    }

    const satisfiedBuilder: SatisfiedAwsDatabricksJobBuilder = {
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AwsDatabricksJobConfig,
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
    if (config.jobName) b.withJobName(config.jobName);
    if (config.taskType) b.withTaskType(config.taskType);
    if (config.notebookPath) b.withNotebookPath(config.notebookPath);
    if (config.pythonFile) b.withPythonFile(config.pythonFile);
    if (config.mainClassName) b.withMainClassName(config.mainClassName);
    if (config.jarUri) b.withJarUri(config.jarUri);
    if (config.parameters) b.withParameters(config.parameters);
    if (config.cronSchedule) b.withCronSchedule(config.cronSchedule);
    if (config.maxRetries !== undefined) b.withMaxRetries(config.maxRetries);
    if (config.existingCluster !== undefined)
      b.withExistingCluster(config.existingCluster);

    return b.build();
  };
}
