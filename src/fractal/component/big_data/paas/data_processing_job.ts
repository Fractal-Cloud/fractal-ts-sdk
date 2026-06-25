import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `DataProcessingJob` — the abstract BigData capability "I need to run a Spark /
 * data-processing job". It is satisfied by candidate Offers (e.g.
 * AwsDatabricksJob/AWS, AzureDatabricksJob/Azure, GcpDatabricksJob/GCP, and
 * CaaSSparkJob/CaaS). The dev specializes it through a Fractal Interface using
 * vendor-neutral concepts only and never names a vendor offer.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers), each set via
 * `component.set(key, value)`:
 *   `jobName`, `taskType`, `notebookPath`, `pythonFile`, `mainClassName`,
 *   `jarUri`, `parameters`, `cronSchedule`, `maxRetries`, `existingCluster`,
 *   `artifactType`, `artifactUri`, `packageName`, `entryPoint`, `entryPointArgs`.
 *
 * Vendor-only knobs (e.g. the CaaS-specific `schedule`/`mainClass`) live on the
 * individual offers, NOT on this Interface.
 *
 * A DataProcessingJob logically depends on the compute that runs it — a
 * `ComputeCluster` (managed Databricks/Spark cluster) and/or a
 * `DistributedDataProcessing` platform. The infra team wires those dependencies
 * when authoring the Fractal by passing `dependencies` on the config; the agent
 * uses them only for reconciliation ordering.
 */
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
export const ARTIFACT_TYPE_PARAM = 'artifactType';
export const ARTIFACT_URI_PARAM = 'artifactUri';
export const PACKAGE_NAME_PARAM = 'packageName';
export const ENTRY_POINT_PARAM = 'entryPoint';
export const ENTRY_POINT_ARGS_PARAM = 'entryPointArgs';

export type DataProcessingJobConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this data-processing job. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace DataProcessingJob {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'DataProcessingJob';

  export const create = (config: DataProcessingJobConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.BigData,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
