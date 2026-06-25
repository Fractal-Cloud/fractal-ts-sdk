import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent constant: JAEGER_COMPONENT_NAME = "Jaeger"
const JAEGER_TYPE_NAME = 'Jaeger';

// Vendor-only parameter keys this offer supports. These are NOT Fractal
// Interface ops (no other offer shares them); they are carried through as
// vendor-specific extras when set on the abstract component.
export const NAMESPACE_PARAM = 'namespace';
export const STORAGE_PARAM = 'storage';
export const ELASTIC_INSTANCES_PARAM = 'elasticInstances';
export const ELASTIC_VERSION_PARAM = 'elasticVersion';

function buildJaegerType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Observability)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(PascalCaseString.getBuilder().withValue(JAEGER_TYPE_NAME).build())
    .build();
}

const JAEGER_TYPE = buildJaegerType();

/**
 * Jaeger — CaaS distributed-tracing Offer satisfying the abstract Tracing.
 * Inherits any vendor-neutral parameters, dependencies and links from the
 * abstract component. Jaeger's vendor-only knobs (`namespace`, `storage`,
 * `elasticInstances`, `elasticVersion`) are not part of the neutral Interface.
 * No vendor sub-components.
 */
export const Jaeger: Offer = {
  type: JAEGER_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, JAEGER_TYPE, 'CaaS')],
};
