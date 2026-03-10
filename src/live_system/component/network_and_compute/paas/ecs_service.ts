import {getLiveSystemComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {
  GenericParameters,
  getParametersInstance,
} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {LiveSystemComponent} from '../../index';
import {BlueprintComponent} from '../../../../fractal/component/index';
import {BlueprintComponentDependency} from '../../../../fractal/component/dependency';
import {DESIRED_COUNT_PARAM} from '../../../../fractal/component/custom_workloads/caas/workload';

// Agent constant: ECS_SERVICE_COMPONENT_NAME = "ECSService"
const ECS_SERVICE_TYPE_NAME = 'ECSService';
const LAUNCH_TYPE_PARAM = 'launchType';
const ASSIGN_PUBLIC_IP_PARAM = 'assignPublicIp';

// ── internal helpers ──────────────────────────────────────────────────────────

function buildId(id: string): ComponentId {
  return getComponentIdBuilder()
    .withValue(KebabCaseString.getBuilder().withValue(id).build())
    .build();
}

function buildVersion(major: number, minor: number, patch: number): Version {
  return getVersionBuilder()
    .withMajor(major)
    .withMinor(minor)
    .withPatch(patch)
    .build();
}

function buildAwsEcsServiceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(ECS_SERVICE_TYPE_NAME).build(),
    )
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returned by satisfy() — all structural properties (dependencies, links,
 * desiredCount) are locked from the blueprint. Only AWS-specific launch
 * parameters and live-system sub-component dependencies are set here.
 */
export type SatisfiedAwsEcsServiceBuilder = {
  withLaunchType: (type: string) => SatisfiedAwsEcsServiceBuilder;
  withAssignPublicIp: (assign: boolean) => SatisfiedAwsEcsServiceBuilder;
  /**
   * Declares a live-system-only dependency on the ECS Task Definition that
   * this service will run. This has no blueprint equivalent — it is an
   * AWS-specific sub-component relationship.
   */
  withTaskDefinition: (
    taskDef: LiveSystemComponent,
  ) => SatisfiedAwsEcsServiceBuilder;
  build: () => LiveSystemComponent;
};

export type AwsEcsServiceBuilder = {
  withId: (id: string) => AwsEcsServiceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsEcsServiceBuilder;
  withDisplayName: (displayName: string) => AwsEcsServiceBuilder;
  withDescription: (description: string) => AwsEcsServiceBuilder;
  withDesiredCount: (count: number) => AwsEcsServiceBuilder;
  withLaunchType: (type: string) => AwsEcsServiceBuilder;
  withAssignPublicIp: (assign: boolean) => AwsEcsServiceBuilder;
  build: () => LiveSystemComponent;
};

export type AwsEcsServiceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  desiredCount?: number;
  launchType?: string;
  assignPublicIp?: boolean;
};

export namespace AwsEcsService {
  export const getBuilder = (): AwsEcsServiceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEcsServiceType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsEcsServiceBuilder = {
      withId: id => {
        inner.withId(buildId(id));
        return builder;
      },
      withVersion: (major, minor, patch) => {
        inner.withVersion(buildVersion(major, minor, patch));
        return builder;
      },
      withDisplayName: displayName => {
        inner.withDisplayName(displayName);
        return builder;
      },
      withDescription: description => {
        inner.withDescription(description);
        return builder;
      },
      withDesiredCount: count => {
        pushParam(params, DESIRED_COUNT_PARAM, count);
        return builder;
      },
      withLaunchType: type => {
        pushParam(params, LAUNCH_TYPE_PARAM, type);
        return builder;
      },
      withAssignPublicIp: assign => {
        pushParam(params, ASSIGN_PUBLIC_IP_PARAM, assign);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Workload component as an AWS ECS Service.
   * All structural properties — dependencies (subnet, cluster), links
   * (traffic rules, SG membership), and desiredCount — are carried from
   * the blueprint unchanged. Only AWS-specific launch parameters are added here.
   */
  /**
   * Satisfies a blueprint Workload component as an AWS ECS Service.
   * All structural properties — dependencies (subnet, cluster), links
   * (traffic rules, SG membership), and desiredCount — are carried from
   * the blueprint unchanged. Only AWS-specific launch parameters are added here.
   */
  export const satisfy = (
    workload: BlueprintComponent,
  ): SatisfiedAwsEcsServiceBuilder => {
    const params = getParametersInstance();
    // Mutable list — starts with blueprint deps, extended by withTaskDefinition()
    const deps: BlueprintComponentDependency[] = [...workload.dependencies];

    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsEcsServiceType())
      .withParameters(params)
      .withProvider('AWS')
      .withId(buildId(workload.id.toString()))
      .withVersion(
        buildVersion(
          workload.version.major,
          workload.version.minor,
          workload.version.patch,
        ),
      )
      .withDisplayName(workload.displayName)
      .withDependencies(deps)
      .withLinks(workload.links);

    if (workload.description) inner.withDescription(workload.description);

    // Carry desiredCount from blueprint
    const desiredCount =
      workload.parameters.getOptionalFieldByName(DESIRED_COUNT_PARAM);
    if (desiredCount !== null)
      pushParam(params, DESIRED_COUNT_PARAM, desiredCount);

    const satisfiedBuilder: SatisfiedAwsEcsServiceBuilder = {
      withLaunchType: type => {
        pushParam(params, LAUNCH_TYPE_PARAM, type);
        return satisfiedBuilder;
      },
      withAssignPublicIp: assign => {
        pushParam(params, ASSIGN_PUBLIC_IP_PARAM, assign);
        return satisfiedBuilder;
      },
      withTaskDefinition: taskDef => {
        deps.push({id: taskDef.id});
        inner.withDependencies(deps);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsEcsServiceConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.desiredCount !== undefined)
      b.withDesiredCount(config.desiredCount);
    if (config.launchType) b.withLaunchType(config.launchType);
    if (config.assignPublicIp !== undefined)
      b.withAssignPublicIp(config.assignPublicIp);

    return b.build();
  };
}
