import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: OCI_VCN_COMPONENT_NAME = "OciVcn"
const OCI_VCN_TYPE_NAME = 'OciVcn';

function buildOciVcnType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OCI_VCN_TYPE_NAME).build(),
    )
    .build();
}

const OCI_VCN_TYPE = buildOciVcnType();

/**
 * Oracle Cloud VCN — OCI-managed virtual network Offer satisfying the abstract
 * VirtualNetwork. Inherits the vendor-neutral `cidrBlock` parameter. The
 * vendor-only knob (compartmentId) is an offer-level extra and is not part of the
 * neutral Interface.
 */
export const OciVcn: Offer = {
  type: OCI_VCN_TYPE,
  provider: 'OCI',
  instantiate: ctx => [instantiateFromNeutral(ctx, OCI_VCN_TYPE, 'OCI')],
};
