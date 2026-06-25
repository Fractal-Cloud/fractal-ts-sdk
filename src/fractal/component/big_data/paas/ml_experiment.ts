import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `MlExperiment` — the abstract BigData capability "I need an ML experiment
 * tracker". It is satisfied by candidate Offers (e.g. AwsDatabricksMlflow/AWS,
 * AzureDatabricksMlflow/Azure, GcpDatabricksMlflow/GCP on the PaaS Databricks
 * MLflow path, and CaaSMlflow/CaaS on the self-hosted Spark path). The dev
 * specializes it through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): `experimentName`,
 * `artifactLocation`. Vendor-only knobs (e.g. the CaaS offer's `namespace`,
 * `trackingUri`, `artifactRoot`) live on the individual offers, NOT on this
 * Interface.
 *
 * An MlExperiment logically depends on a ComputeCluster (the cluster running the
 * experiment) and a DistributedDataProcessing job (the workload producing runs);
 * the infra team wires those dependencies when authoring the Fractal.
 */
export const EXPERIMENT_NAME_PARAM = 'experimentName';
export const ARTIFACT_LOCATION_PARAM = 'artifactLocation';

export type MlExperimentConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this ML experiment. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace MlExperiment {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'MlExperiment';

  export const create = (config: MlExperimentConfig): AbstractComponent =>
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
