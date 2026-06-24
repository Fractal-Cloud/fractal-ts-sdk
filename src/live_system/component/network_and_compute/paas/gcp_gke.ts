import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.PaaS.Gke
const GKE_TYPE_NAME = 'Gke';

function buildGkeType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(GKE_TYPE_NAME).build())
    .build();
}

const GKE_TYPE = buildGkeType();

/**
 * Google GKE — GCP-managed Kubernetes Offer satisfying the abstract
 * ContainerPlatform. Inherits the vendor-neutral `nodePools` Interface op.
 *
 * Vendor-only knobs (single-offer, NOT on the neutral Interface; set on this
 * offer's own config when needed): kubernetesVersion, networkPolicyProvider,
 * masterIpv4CidrBlock, networkName, subnetworkName, subnetworkIpRange,
 * serviceIpRange, podIpRange, podsRangeName, servicesRangeName, priorityClasses,
 * roles, workloadIdentityEnabled, privateClusterDisabled.
 */
export const Gke: Offer = {
  type: GKE_TYPE,
  provider: 'GCP',
  instantiate: ctx => [instantiateFromNeutral(ctx, GKE_TYPE, 'GCP')],
};
