import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `Datalake` — the abstract BigData capability "I need a data lake". It is
 * satisfied by candidate Offers (e.g. AwsS3Datalake on AWS, AzureDatalake on
 * Azure, GcpDatalake on GCP). The dev specializes it through a Fractal Interface
 * using vendor-neutral concepts only.
 *
 * Neutral Interface ops (shared by ≥2 candidate offers): none — every datalake
 * knob (bucket/versioning on AWS, azureRegion/azureResourceGroup on Azure,
 * bucketName/region/storageClass/... on GCP) is supported by exactly one offer,
 * so all of them are vendor-only extras living on the individual offers, NOT on
 * this Interface.
 *
 * The infra team wires any dependencies/links when authoring the Fractal; they
 * flow through to whichever offer the provider selects.
 */
export type DatalakeConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this data lake. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Datalake {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'Datalake';

  export const create = (config: DatalakeConfig): AbstractComponent =>
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
