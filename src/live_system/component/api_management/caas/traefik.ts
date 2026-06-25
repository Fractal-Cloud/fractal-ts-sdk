import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

const TRAEFIK_TYPE_NAME = 'Traefik';

function buildTraefikType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(TRAEFIK_TYPE_NAME).build(),
    )
    .build();
}

const TRAEFIK_TYPE = buildTraefikType();

/**
 * Traefik — CaaS API gateway Offer satisfying the abstract APIGateway. Inherits
 * the vendor-neutral `namespace` parameter. Traefik's vendor-only knobs
 * (`hostname`, `loadbalancerIp`, `oidcClientId`, `oidcClientSecretId`,
 * `forwardAuthSecretId`, `oidcIssuerUrl`, `entryPoints`, `tlsCertificates`,
 * `tlsSettings`, `securityHeadersSettings`) are not part of the neutral
 * Interface. No sub-components.
 */
export const Traefik: Offer = {
  type: TRAEFIK_TYPE,
  provider: 'CaaS',
  instantiate: ctx => [instantiateFromNeutral(ctx, TRAEFIK_TYPE, 'CaaS')],
};
