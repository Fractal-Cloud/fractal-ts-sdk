import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const PROMETHEUS_TYPE_NAME = 'Prometheus';

function buildPrometheusType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Observability)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(PROMETHEUS_TYPE_NAME).build(),
    )
    .build();
}

const PROMETHEUS_TYPE = buildPrometheusType();

/**
 * Prometheus — CaaS metrics/monitoring Offer satisfying the abstract Monitoring.
 * Inherits whatever vendor-neutral parameters the dev sets through the Fractal
 * Interface. Prometheus's vendor-only knobs (`namespace`, `apiGatewayUrl`) are
 * not part of the neutral Interface. No sub-components.
 */
export const Prometheus: Offer = {
  type: PROMETHEUS_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, PROMETHEUS_TYPE, 'CaaS')],
};
