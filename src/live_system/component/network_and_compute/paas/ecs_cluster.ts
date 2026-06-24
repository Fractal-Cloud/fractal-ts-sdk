import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';

// Agent offer constant: NetworkAndCompute.PaaS.ECS
const ECS_TYPE_NAME = 'ECS';

function buildEcsType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(ECS_TYPE_NAME).build())
    .build();
}

const ECS_TYPE = buildEcsType();

/**
 * Amazon ECS — AWS-managed container platform Offer satisfying the abstract
 * ContainerPlatform. Inherits the vendor-neutral `nodePools` Interface op.
 *
 * Vendor-only knobs (single-offer, NOT on the neutral Interface; set on this
 * offer's own config when needed): networkMode, executionRoleArn, taskRoleArn,
 * launchType, capacityProviders. A basic ECS cluster carries no sub-components
 * in this offer; the ECS task definition and service are migrated as their own
 * Workload offers.
 */
export const EcsCluster: Offer = {
  type: ECS_TYPE,
  provider: 'AWS',
  instantiate: ctx => [instantiateFromNeutral(ctx, ECS_TYPE, 'AWS')],
};
