import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {getComponentIdBuilder} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';

/**
 * `ComputeCluster` — the abstract BigData capability "I need a Spark compute
 * cluster". It is satisfied by candidate Offers (e.g. AwsDatabricksCluster,
 * AzureDatabricksCluster and GcpDatabricksCluster on the managed PaaS side,
 * CaaSSparkCluster on Kubernetes). The dev specializes it through a Fractal
 * Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `clusterName`,
 * `sparkVersion`, `numWorkers`, `minWorkers`, `maxWorkers`, `sparkConf`,
 * `pypiLibraries`, `mavenLibraries`, `autoTerminationMinutes`, `nodeTypeId`,
 * `dataSecurityMode`. Vendor-only knobs (e.g. the CaaS driver/executor sizing)
 * live on the individual offers, NOT on this Interface.
 *
 * A ComputeCluster logically depends on the DistributedDataProcessing platform
 * that hosts it; that dependency is declared by default and merged with any the
 * infra team adds when authoring the Fractal.
 */
export const CLUSTER_NAME_PARAM = 'clusterName';
export const SPARK_VERSION_PARAM = 'sparkVersion';
export const NUM_WORKERS_PARAM = 'numWorkers';
export const MIN_WORKERS_PARAM = 'minWorkers';
export const MAX_WORKERS_PARAM = 'maxWorkers';
export const SPARK_CONF_PARAM = 'sparkConf';
export const PYPI_LIBRARIES_PARAM = 'pypiLibraries';
export const MAVEN_LIBRARIES_PARAM = 'mavenLibraries';
export const AUTO_TERMINATION_MINUTES_PARAM = 'autoTerminationMinutes';
export const NODE_TYPE_ID_PARAM = 'nodeTypeId';
export const DATA_SECURITY_MODE_PARAM = 'dataSecurityMode';

/** Default platform dependency every ComputeCluster carries. */
const DISTRIBUTED_DATA_PROCESSING_DEPENDENCY_ID = 'distributed-data-processing';

export type ComputeClusterConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this compute cluster. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ComputeCluster {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'ComputeCluster';

  /** Service this capability depends on by default. */
  export const DEPENDS_ON = ['DistributedDataProcessing'];

  export const create = (config: ComputeClusterConfig): AbstractComponent => {
    const defaultDependency: BlueprintComponentDependency = {
      id: getComponentIdBuilder()
        .withValue(
          KebabCaseString.getBuilder()
            .withValue(DISTRIBUTED_DATA_PROCESSING_DEPENDENCY_ID)
            .build(),
        )
        .build(),
    };

    const dependencies: BlueprintComponentDependency[] = [
      defaultDependency,
      ...(config.dependencies ?? []),
    ];

    return createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.BigData,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies,
      links: config.links,
    });
  };
}
