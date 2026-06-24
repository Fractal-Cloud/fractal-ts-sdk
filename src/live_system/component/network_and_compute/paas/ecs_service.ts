import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getComponentIdBuilder} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {Offer, instantiateFromNeutral} from '../../../../fractal/offer';
import {getParametersInstance as getParams} from '../../../../values/generic_parameters';

// BFF offer id: NetworkAndCompute.CaaS.ECSService
const ECS_SERVICE_TYPE_NAME = 'ECSService';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildAwsEcsServiceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ECS_SERVICE_TYPE_NAME).build(),
    )
    .build();
}

function buildAwsEcsTaskDefType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue('ECSTaskDefinition').build(),
    )
    .build();
}

// ── Functional Offer (Fractal + Interface migration) ──────────────────────────

const ECS_SERVICE_OFFER_TYPE = buildAwsEcsServiceType();

/**
 * AWS ECS Service Offer satisfying the abstract `Workload`. Inherits the
 * vendor-neutral parameters (`image`, `port`, `replicas`, `env`), dependencies
 * and links, and additionally emits the live-system-only ECS Task Definition
 * sub-component (`${id}-task`) — wiring it as a dependency of the primary
 * service. The sub-component is returned as an extra array entry.
 */
export const EcsService: Offer = {
  type: ECS_SERVICE_OFFER_TYPE,
  provider: 'AWS',
  instantiate: ctx => {
    const taskDefId = getComponentIdBuilder()
      .withValue(
        KebabCaseString.getBuilder()
          .withValue(`${ctx.id.toString()}-task`)
          .build(),
      )
      .build();

    // Sub-component: ECS Task Definition. Carries the neutral params that
    // describe what the container runs (image/port/...).
    const taskParams = getParams();
    const neutral = ctx.neutralParameters.toMap();
    for (const key of Object.keys(neutral)) {
      taskParams.push(key, neutral[key] as Record<string, object>);
    }
    const taskDefinition = getLiveSystemComponentBuilder()
      .withType(buildAwsEcsTaskDefType())
      .withId(taskDefId)
      .withVersion(ctx.version)
      .withDisplayName(`${ctx.displayName} Task Definition`)
      .withDescription(ctx.description)
      .withProvider('AWS')
      .withParameters(taskParams)
      .build();

    // Primary service depends on the task definition (live-system-only dep).
    const primary = instantiateFromNeutral(
      {...ctx, dependencies: [...ctx.dependencies, {id: taskDefId}]},
      ECS_SERVICE_OFFER_TYPE,
      'AWS',
    );

    return [primary, taskDefinition];
  },
};
