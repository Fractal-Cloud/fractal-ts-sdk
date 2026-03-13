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

// BFF offer id: NetworkAndCompute.IaaS.GlobalLoadBalancer
const TYPE_NAME = 'GlobalLoadBalancer';
const LOAD_BALANCING_SCHEME_PARAM = 'loadBalancingScheme';
const IP_PROTOCOL_PARAM = 'ipProtocol';
const PORT_RANGE_PARAM = 'portRange';
const TARGET_PARAM = 'target';
const IP_ADDRESS_PARAM = 'ipAddress';

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

function buildGcpGlbType(): BlueprintComponentType {
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
export type SatisfiedGcpGlbBuilder = {
  withLoadBalancingScheme: (
    scheme: 'EXTERNAL' | 'INTERNAL',
  ) => SatisfiedGcpGlbBuilder;
  withIpProtocol: (protocol: string) => SatisfiedGcpGlbBuilder;
  withPortRange: (portRange: string) => SatisfiedGcpGlbBuilder;
  withTarget: (target: string) => SatisfiedGcpGlbBuilder;
  withIpAddress: (ipAddress: string) => SatisfiedGcpGlbBuilder;
  build: () => LiveSystemComponent;
};

export type GcpGlbBuilder = {
  withId: (id: string) => GcpGlbBuilder;
  withVersion: (major: number, minor: number, patch: number) => GcpGlbBuilder;
  withDisplayName: (displayName: string) => GcpGlbBuilder;
  withDescription: (description: string) => GcpGlbBuilder;
  withLoadBalancingScheme: (scheme: 'EXTERNAL' | 'INTERNAL') => GcpGlbBuilder;
  withIpProtocol: (protocol: string) => GcpGlbBuilder;
  withPortRange: (portRange: string) => GcpGlbBuilder;
  withTarget: (target: string) => GcpGlbBuilder;
  withIpAddress: (ipAddress: string) => GcpGlbBuilder;
  build: () => LiveSystemComponent;
};

export type GcpGlbConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  loadBalancingScheme?: 'EXTERNAL' | 'INTERNAL';
  ipProtocol?: string;
  portRange?: string;
  target?: string;
  ipAddress?: string;
};

export namespace GcpGlb {
  export const getBuilder = (): GcpGlbBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpGlbType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpGlbBuilder = {
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
      withLoadBalancingScheme: value => {
        pushParam(params, LOAD_BALANCING_SCHEME_PARAM, value);
        return builder;
      },
      withIpProtocol: value => {
        pushParam(params, IP_PROTOCOL_PARAM, value);
        return builder;
      },
      withPortRange: value => {
        pushParam(params, PORT_RANGE_PARAM, value);
        return builder;
      },
      withTarget: value => {
        pushParam(params, TARGET_PARAM, value);
        return builder;
      },
      withIpAddress: value => {
        pushParam(params, IP_ADDRESS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpGlbBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildGcpGlbType())
      .withParameters(params)
      .withProvider('GCP')
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

    const satisfiedBuilder: SatisfiedGcpGlbBuilder = {
      withLoadBalancingScheme: value => {
        pushParam(params, LOAD_BALANCING_SCHEME_PARAM, value);
        return satisfiedBuilder;
      },
      withIpProtocol: value => {
        pushParam(params, IP_PROTOCOL_PARAM, value);
        return satisfiedBuilder;
      },
      withPortRange: value => {
        pushParam(params, PORT_RANGE_PARAM, value);
        return satisfiedBuilder;
      },
      withTarget: value => {
        pushParam(params, TARGET_PARAM, value);
        return satisfiedBuilder;
      },
      withIpAddress: value => {
        pushParam(params, IP_ADDRESS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpGlbConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.loadBalancingScheme)
      b.withLoadBalancingScheme(config.loadBalancingScheme);
    if (config.ipProtocol) b.withIpProtocol(config.ipProtocol);
    if (config.portRange) b.withPortRange(config.portRange);
    if (config.target) b.withTarget(config.target);
    if (config.ipAddress) b.withIpAddress(config.ipAddress);

    return b.build();
  };
}
