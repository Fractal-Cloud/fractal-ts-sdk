import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
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
import {BlueprintComponent} from '../../index';

export const DATA_PROCESSING_JOB_TYPE_NAME = 'DataProcessingJob';
export const JOB_NAME_PARAM = 'jobName';
export const TASK_TYPE_PARAM = 'taskType';
export const NOTEBOOK_PATH_PARAM = 'notebookPath';
export const PYTHON_FILE_PARAM = 'pythonFile';
export const MAIN_CLASS_NAME_PARAM = 'mainClassName';
export const JAR_URI_PARAM = 'jarUri';
export const PARAMETERS_PARAM = 'parameters';
export const CRON_SCHEDULE_PARAM = 'cronSchedule';
export const MAX_RETRIES_PARAM = 'maxRetries';
export const EXISTING_CLUSTER_PARAM = 'existingCluster';

// Artifact-driven (Python wheel) execution. The dev publishes a wheel to a
// registry; the agent downloads it, uploads to the runtime (DBFS / Volume /
// init container) and creates a python_wheel_task or equivalent. Devs never
// see Databricks notebooks or SparkApplication CRs.
export const ARTIFACT_TYPE_PARAM = 'artifactType';      // "python_wheel" | "notebook"
export const ARTIFACT_URI_PARAM = 'artifactUri';        // gs://, s3://, oci://, https://
export const PACKAGE_NAME_PARAM = 'packageName';        // Python package name in the wheel
export const ENTRY_POINT_PARAM = 'entryPoint';          // module:function or function name
export const ENTRY_POINT_ARGS_PARAM = 'entryPointArgs'; // string[] passed to entry point

export const ARTIFACT_TYPE_PYTHON_WHEEL = 'python_wheel';
export const ARTIFACT_TYPE_NOTEBOOK = 'notebook';

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

function buildDataProcessingJobType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(DATA_PROCESSING_JOB_TYPE_NAME)
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

export type DataProcessingJobComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type DataProcessingJobBuilder = {
  withId: (id: string) => DataProcessingJobBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => DataProcessingJobBuilder;
  withDisplayName: (displayName: string) => DataProcessingJobBuilder;
  withDescription: (description: string) => DataProcessingJobBuilder;
  withJobName: (name: string) => DataProcessingJobBuilder;
  withTaskType: (taskType: string) => DataProcessingJobBuilder;
  withNotebookPath: (path: string) => DataProcessingJobBuilder;
  withPythonFile: (file: string) => DataProcessingJobBuilder;
  withMainClassName: (className: string) => DataProcessingJobBuilder;
  withJarUri: (uri: string) => DataProcessingJobBuilder;
  withParameters: (params: string[]) => DataProcessingJobBuilder;
  withCronSchedule: (cron: string) => DataProcessingJobBuilder;
  withMaxRetries: (retries: number) => DataProcessingJobBuilder;
  withExistingCluster: (useExisting: boolean) => DataProcessingJobBuilder;
  /** Vendor-agnostic Python wheel execution. The agent downloads from artifactUri and wraps for the runtime. */
  withArtifactType: (type: string) => DataProcessingJobBuilder;
  withArtifactUri: (uri: string) => DataProcessingJobBuilder;
  withPackageName: (name: string) => DataProcessingJobBuilder;
  withEntryPoint: (entry: string) => DataProcessingJobBuilder;
  withEntryPointArgs: (args: string[]) => DataProcessingJobBuilder;
  build: () => BlueprintComponent;
};

export type DataProcessingJobConfig = {
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
  artifactType?: string;
  artifactUri?: string;
  packageName?: string;
  entryPoint?: string;
  entryPointArgs?: string[];
};

function makeDataProcessingJobComponent(
  component: BlueprintComponent,
): DataProcessingJobComponent {
  return {component, components: [component]};
}

export namespace DataProcessingJob {
  export const getBuilder = (): DataProcessingJobBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildDataProcessingJobType())
      .withParameters(params);

    const builder: DataProcessingJobBuilder = {
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
      withArtifactType: type => {
        pushParam(params, ARTIFACT_TYPE_PARAM, type);
        return builder;
      },
      withArtifactUri: uri => {
        pushParam(params, ARTIFACT_URI_PARAM, uri);
        return builder;
      },
      withPackageName: name => {
        pushParam(params, PACKAGE_NAME_PARAM, name);
        return builder;
      },
      withEntryPoint: entry => {
        pushParam(params, ENTRY_POINT_PARAM, entry);
        return builder;
      },
      withEntryPointArgs: args => {
        pushParam(params, ENTRY_POINT_ARGS_PARAM, args);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: DataProcessingJobConfig,
  ): DataProcessingJobComponent => {
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
    if (config.maxRetries !== undefined) {
      b.withMaxRetries(config.maxRetries);
    }
    if (config.existingCluster !== undefined) {
      b.withExistingCluster(config.existingCluster);
    }
    // artifactType defaults to "python_wheel" when an artifactUri is supplied —
    // devs publishing a wheel don't need to declare the type explicitly.
    if (config.artifactUri) {
      b.withArtifactUri(config.artifactUri);
      b.withArtifactType(config.artifactType ?? ARTIFACT_TYPE_PYTHON_WHEEL);
    } else if (config.artifactType) {
      b.withArtifactType(config.artifactType);
    }
    if (config.packageName) {
      b.withPackageName(config.packageName);
    }
    if (config.entryPoint) {
      b.withEntryPoint(config.entryPoint);
    }
    if (config.entryPointArgs) {
      b.withEntryPointArgs(config.entryPointArgs);
    }

    return makeDataProcessingJobComponent(b.build());
  };
}
