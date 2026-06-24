import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.PaaS.Eks
const EKS_TYPE_NAME = 'Eks';

function buildEksType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(EKS_TYPE_NAME).build())
    .build();
}

const EKS_TYPE = buildEksType();

/**
 * Amazon EKS — AWS-managed Kubernetes Offer satisfying the abstract
 * ContainerPlatform. Inherits the vendor-neutral `nodePools` Interface op.
 *
 * Vendor-only knobs (single-offer, NOT on the neutral Interface; set on this
 * offer's own config when needed): kubernetesVersion, networkPolicyProvider,
 * masterIpv4CidrBlock, vpcCidrBlock, privateSubnetCidrs,
 * desiredAvailabilityZoneCount, addons, priorityClasses, roles,
 * workloadIdentityEnabled, privateClusterDisabled.
 */
export const Eks: Offer = {
  type: EKS_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, EKS_TYPE, 'AWS')],
};
