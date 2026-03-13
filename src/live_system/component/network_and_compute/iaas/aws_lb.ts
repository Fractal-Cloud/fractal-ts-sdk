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

// BFF offer id: NetworkAndCompute.IaaS.LoadBalancer
const TYPE_NAME = 'LoadBalancer';
const LOAD_BALANCER_TYPE_PARAM = 'loadBalancerType';
const INTERNAL_PARAM = 'internal';
const ENABLE_DELETION_PROTECTION_PARAM = 'enableDeletionProtection';
const IDLE_TIMEOUT_PARAM = 'idleTimeout';
const IP_ADDRESS_TYPE_PARAM = 'ipAddressType';

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

function buildAwsLbType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.IaaS)
    .withName(PascalCaseString.getBuilder().withValue(TYPE_NAME).build())
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
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedAwsLbBuilder = {
  withLoadBalancerType: (loadBalancerType: string) => SatisfiedAwsLbBuilder;
  withInternal: (internal: boolean) => SatisfiedAwsLbBuilder;
  withEnableDeletionProtection: (enable: boolean) => SatisfiedAwsLbBuilder;
  withIdleTimeout: (idleTimeout: number) => SatisfiedAwsLbBuilder;
  withIpAddressType: (ipAddressType: string) => SatisfiedAwsLbBuilder;
  build: () => LiveSystemComponent;
};

export type AwsLbBuilder = {
  withId: (id: string) => AwsLbBuilder;
  withVersion: (major: number, minor: number, patch: number) => AwsLbBuilder;
  withDisplayName: (displayName: string) => AwsLbBuilder;
  withDescription: (description: string) => AwsLbBuilder;
  withLoadBalancerType: (loadBalancerType: string) => AwsLbBuilder;
  withInternal: (internal: boolean) => AwsLbBuilder;
  withEnableDeletionProtection: (enable: boolean) => AwsLbBuilder;
  withIdleTimeout: (idleTimeout: number) => AwsLbBuilder;
  withIpAddressType: (ipAddressType: string) => AwsLbBuilder;
  build: () => LiveSystemComponent;
};

export type AwsLbConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  loadBalancerType?: string;
  internal?: boolean;
  enableDeletionProtection?: boolean;
  idleTimeout?: number;
  ipAddressType?: string;
};

export namespace AwsLb {
  export const getBuilder = (): AwsLbBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsLbType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsLbBuilder = {
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
      withLoadBalancerType: value => {
        pushParam(params, LOAD_BALANCER_TYPE_PARAM, value);
        return builder;
      },
      withInternal: value => {
        pushParam(params, INTERNAL_PARAM, value);
        return builder;
      },
      withEnableDeletionProtection: value => {
        pushParam(params, ENABLE_DELETION_PROTECTION_PARAM, value);
        return builder;
      },
      withIdleTimeout: value => {
        pushParam(params, IDLE_TIMEOUT_PARAM, value);
        return builder;
      },
      withIpAddressType: value => {
        pushParam(params, IP_ADDRESS_TYPE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsLbBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsLbType())
      .withParameters(params)
      .withProvider('AWS')
      .withId(buildId(blueprint.id.toString()))
      .withVersion(
        buildVersion(
          blueprint.version.major,
          blueprint.version.minor,
          blueprint.version.patch,
        ),
      )
      .withDisplayName(blueprint.displayName)
      .withDependencies(blueprint.dependencies)
      .withLinks(blueprint.links);

    if (blueprint.description) inner.withDescription(blueprint.description);

    const satisfiedBuilder: SatisfiedAwsLbBuilder = {
      withLoadBalancerType: value => {
        pushParam(params, LOAD_BALANCER_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withInternal: value => {
        pushParam(params, INTERNAL_PARAM, value);
        return satisfiedBuilder;
      },
      withEnableDeletionProtection: value => {
        pushParam(params, ENABLE_DELETION_PROTECTION_PARAM, value);
        return satisfiedBuilder;
      },
      withIdleTimeout: value => {
        pushParam(params, IDLE_TIMEOUT_PARAM, value);
        return satisfiedBuilder;
      },
      withIpAddressType: value => {
        pushParam(params, IP_ADDRESS_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsLbConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.loadBalancerType)
      b.withLoadBalancerType(config.loadBalancerType);
    if (config.internal !== undefined) b.withInternal(config.internal);
    if (config.enableDeletionProtection !== undefined)
      b.withEnableDeletionProtection(config.enableDeletionProtection);
    if (config.idleTimeout !== undefined) b.withIdleTimeout(config.idleTimeout);
    if (config.ipAddressType) b.withIpAddressType(config.ipAddressType);

    return b.build();
  };
}
