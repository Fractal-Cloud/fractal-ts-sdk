import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

/**
 * `ApiGateway` — the abstract APIManagement capability "I need an API gateway".
 * It is satisfied by candidate Offers (e.g. AwsCloudFront on AWS,
 * AzureApiManagement on Azure, GcpApiGateway on GCP). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * This capability has no vendor-neutral knobs — every API gateway setting is
 * vendor-specific (region, sku, publisher details, api ids, etc.), so the
 * Interface declares no neutral ops. Vendor-only knobs live on the individual
 * offers, NOT on this Interface.
 */
export type ApiGatewayConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this API gateway. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace ApiGateway {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'APIGateway';

  export const create = (config: ApiGatewayConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.ApiManagement,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
