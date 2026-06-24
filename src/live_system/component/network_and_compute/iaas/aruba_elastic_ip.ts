import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.ArubaElasticIp
// Matches aria-agent-aruba handlers/elastic_ip.go.
const ARUBA_ELASTIC_IP_TYPE_NAME = 'ArubaElasticIp';

function buildArubaElasticIpType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_ELASTIC_IP_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_ELASTIC_IP_TYPE = buildArubaElasticIpType();

/**
 * Aruba Elastic IP — Aruba-managed static public IP Offer satisfying the
 * abstract ElasticIp. Inherits all vendor-neutral parameters, dependencies and
 * links; adds no vendor-only knobs and emits no sub-components in v1.
 */
export const ArubaElasticIp: Offer = {
  type: ARUBA_ELASTIC_IP_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_ELASTIC_IP_TYPE, 'Aruba'),
  ],
};
