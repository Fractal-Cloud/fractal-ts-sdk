import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.IaaS.ArubaSshKeyPair
// Matches aria-agent-aruba handlers/ssh_key_pair.go.
const ARUBA_SSH_KEY_PAIR_TYPE_NAME = 'ArubaSshKeyPair';

function buildArubaSshKeyPairType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_SSH_KEY_PAIR_TYPE_NAME)
        .build(),
    )
    .build();
}

const ARUBA_SSH_KEY_PAIR_TYPE = buildArubaSshKeyPairType();

/**
 * Aruba SSH Key Pair — Aruba Cloud Offer satisfying the abstract SshKeyPair.
 * Inherits the vendor-neutral `publicKey` and `keyName` parameters and adds no
 * vendor-only knobs in v1.
 */
export const ArubaSshKeyPair: Offer = {
  type: ARUBA_SSH_KEY_PAIR_TYPE,
  provider: 'Aruba',
  instantiate: ctx => [
    instantiateFromNeutral(ctx, ARUBA_SSH_KEY_PAIR_TYPE, 'Aruba'),
  ],
};
