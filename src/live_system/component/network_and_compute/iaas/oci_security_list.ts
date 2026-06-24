import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.OciSecurityList
const OCI_SECURITY_LIST_TYPE_NAME = 'OciSecurityList';
const COMPARTMENT_ID_PARAM = 'compartmentId';

function buildOciSecurityListType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OCI_SECURITY_LIST_TYPE_NAME)
        .build(),
    )
    .build();
}

const OCI_SECURITY_LIST_TYPE = buildOciSecurityListType();

// Re-export the neutral ingress-rule shape for consumers importing it here.
export type {IngressRule} from '../../../../fractal/component/network_and_compute/iaas/security_group';

/** OCI-only knobs that are not part of the neutral Interface. */
export type OciSecurityListVendorConfig = {
  compartmentId: string;
};

/**
 * OciSecurityList — Oracle Cloud Infrastructure security list Offer satisfying
 * the abstract SecurityGroup. Inherits all vendor-neutral parameters
 * (description, ingressRules) and additionally carries the OCI-only
 * `compartmentId` knob, which is NOT exposed on the Fractal Interface.
 */
export function OciSecurityList(vendor: OciSecurityListVendorConfig): Offer {
  return {
    type: OCI_SECURITY_LIST_TYPE,
    provider: 'OCI',
    instantiate: ctx => {
      const primary = instantiateFromNeutral(
        ctx,
        OCI_SECURITY_LIST_TYPE,
        'OCI',
      );
      primary.parameters.push(
        COMPARTMENT_ID_PARAM,
        vendor.compartmentId as never,
      );
      return [primary];
    },
  };
}
