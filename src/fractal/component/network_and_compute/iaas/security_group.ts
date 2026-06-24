import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';

/**
 * `SecurityGroup` — the abstract NetworkAndCompute capability "I need a managed
 * set of network traffic rules". It is satisfied by candidate Offers
 * (AwsSecurityGroup on AWS, AzureNsg on Azure, GcpFirewall on GCP,
 * HetznerFirewall on Hetzner, OciSecurityList on OCI, ArubaSecurityGroup on
 * Aruba, OpenshiftSecurityGroup on RedHat/OpenShift). The dev specializes it
 * through a Fractal Interface using vendor-neutral concepts only.
 *
 * Neutral knobs shared by every candidate offer — and therefore Fractal
 * Interface ops:
 *   - `description`
 *   - `ingressRules`
 *
 * Vendor-only extras (location, resourceGroup, compartmentId, name, policyType,
 * podSelector, egressRules, ...) live on each offer, never on the Interface.
 */

/** Neutral parameter key carried by every SecurityGroup offer. */
export const DESCRIPTION_PARAM = 'description';
/** Neutral parameter key carried by every SecurityGroup offer. */
export const INGRESS_RULES_PARAM = 'ingressRules';

/** Vendor-neutral shape of a single ingress rule, shared by every offer. */
export type IngressRule = {
  protocol?: string;
  fromPort: number;
  toPort?: number;
  sourceCidr?: string;
  sourceGroupId?: string;
};

export type SecurityGroupConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this security group. */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace SecurityGroup {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = 'SecurityGroup';

  export const create = (config: SecurityGroupConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.NetworkAndCompute,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
