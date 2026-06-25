import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer: Storage.CaaS.OpenshiftPersistentVolume — provisions an OpenShift
// PersistentVolume backing a search workload and satisfies the abstract Search
// blueprint via the catalogue's service ancestry.
const OPENSHIFT_PV_TYPE_NAME = 'OpenshiftPersistentVolume';

function buildOpenshiftPersistentVolumeType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(OPENSHIFT_PV_TYPE_NAME).build(),
    )
    .build();
}

const OPENSHIFT_PV_TYPE = buildOpenshiftPersistentVolumeType();

/**
 * OpenshiftPersistentVolume — RedHat OpenShift PersistentVolume Offer satisfying
 * the abstract Search. Inherits the vendor-neutral `namespace` parameter.
 * Vendor-only knobs (name, storageSize, storageClassName, accessMode) are
 * offer-level extras and are not part of the neutral Interface.
 */
export const OpenshiftPersistentVolume: Offer = {
  type: OPENSHIFT_PV_TYPE,
  provider: 'RedHat',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, OPENSHIFT_PV_TYPE, 'RedHat'),
  ],
};
