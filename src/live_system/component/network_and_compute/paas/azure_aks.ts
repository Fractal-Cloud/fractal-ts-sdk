import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.PaaS.Aks
const AKS_TYPE_NAME = 'Aks';

function buildAksType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(AKS_TYPE_NAME).build())
    .build();
}

const AKS_TYPE = buildAksType();

/**
 * Azure AKS — Azure-managed Kubernetes Offer satisfying the abstract
 * ContainerPlatform. Inherits the vendor-neutral `nodePools` Interface op.
 *
 * Vendor-only knobs (single-offer, NOT on the neutral Interface; set on this
 * offer's own config when needed): kubernetesVersion, networkPolicyProvider,
 * masterIpv4CidrBlock, vnetSubnetAddressIpRange, managedClusterSkuTier,
 * windowsAdminUsername, externalWorkspaceResourceId, azureActiveDirectoryProfile,
 * outboundIps, priorityClasses, roles, workloadIdentityEnabled,
 * privateClusterDisabled.
 */
export const Aks: Offer = {
  type: AKS_TYPE,
  provider: 'Azure',
  instantiate: ctx => [instantiateFromNeutral(ctx, AKS_TYPE, 'Azure')],
};
