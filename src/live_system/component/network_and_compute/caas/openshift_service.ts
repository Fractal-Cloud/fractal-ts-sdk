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

// Agent constant: OfferService = "NetworkAndCompute.CaaS.OpenshiftService"
const OPENSHIFT_SERVICE_TYPE_NAME = 'OpenshiftService';
const NAME_PARAM = 'name';
const PORT_PARAM = 'port';
const TARGET_PORT_PARAM = 'targetPort';
const PROTOCOL_PARAM = 'protocol';
const SERVICE_TYPE_PARAM = 'serviceType';
const CREATE_ROUTE_PARAM = 'createRoute';
const ROUTE_HOSTNAME_PARAM = 'routeHostname';
const ROUTE_TLS_TERMINATION_PARAM = 'routeTlsTermination';

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

function buildOpenshiftServiceType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.NetworkAndCompute)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(OPENSHIFT_SERVICE_TYPE_NAME)
        .build(),
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
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedOpenshiftServiceBuilder = {
  withName: (name: string) => SatisfiedOpenshiftServiceBuilder;
  withPort: (port: number) => SatisfiedOpenshiftServiceBuilder;
  withTargetPort: (targetPort: number) => SatisfiedOpenshiftServiceBuilder;
  withProtocol: (protocol: string) => SatisfiedOpenshiftServiceBuilder;
  withServiceType: (serviceType: string) => SatisfiedOpenshiftServiceBuilder;
  withCreateRoute: (createRoute: boolean) => SatisfiedOpenshiftServiceBuilder;
  withRouteHostname: (hostname: string) => SatisfiedOpenshiftServiceBuilder;
  withRouteTlsTermination: (
    termination: string,
  ) => SatisfiedOpenshiftServiceBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftServiceBuilder = {
  withId: (id: string) => OpenshiftServiceBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => OpenshiftServiceBuilder;
  withDisplayName: (displayName: string) => OpenshiftServiceBuilder;
  withDescription: (description: string) => OpenshiftServiceBuilder;
  withName: (name: string) => OpenshiftServiceBuilder;
  withPort: (port: number) => OpenshiftServiceBuilder;
  withTargetPort: (targetPort: number) => OpenshiftServiceBuilder;
  withProtocol: (protocol: string) => OpenshiftServiceBuilder;
  withServiceType: (serviceType: string) => OpenshiftServiceBuilder;
  withCreateRoute: (createRoute: boolean) => OpenshiftServiceBuilder;
  withRouteHostname: (hostname: string) => OpenshiftServiceBuilder;
  withRouteTlsTermination: (termination: string) => OpenshiftServiceBuilder;
  build: () => LiveSystemComponent;
};

export type OpenshiftServiceConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  name: string;
  port?: number;
  targetPort?: number;
  protocol?: string;
  serviceType?: string;
  createRoute?: boolean;
  routeHostname?: string;
  routeTlsTermination?: string;
};

export namespace OpenshiftService {
  export const getBuilder = (): OpenshiftServiceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftServiceType())
      .withParameters(params)
      .withProvider('RedHat');

    const builder: OpenshiftServiceBuilder = {
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
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return builder;
      },
      withPort: value => {
        pushParam(params, PORT_PARAM, value);
        return builder;
      },
      withTargetPort: value => {
        pushParam(params, TARGET_PORT_PARAM, value);
        return builder;
      },
      withProtocol: value => {
        pushParam(params, PROTOCOL_PARAM, value);
        return builder;
      },
      withServiceType: value => {
        pushParam(params, SERVICE_TYPE_PARAM, value);
        return builder;
      },
      withCreateRoute: value => {
        pushParam(params, CREATE_ROUTE_PARAM, value);
        return builder;
      },
      withRouteHostname: value => {
        pushParam(params, ROUTE_HOSTNAME_PARAM, value);
        return builder;
      },
      withRouteTlsTermination: value => {
        pushParam(params, ROUTE_TLS_TERMINATION_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOpenshiftServiceBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOpenshiftServiceType())
      .withParameters(params)
      .withProvider('RedHat')
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

    const satisfiedBuilder: SatisfiedOpenshiftServiceBuilder = {
      withName: value => {
        pushParam(params, NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withPort: value => {
        pushParam(params, PORT_PARAM, value);
        return satisfiedBuilder;
      },
      withTargetPort: value => {
        pushParam(params, TARGET_PORT_PARAM, value);
        return satisfiedBuilder;
      },
      withProtocol: value => {
        pushParam(params, PROTOCOL_PARAM, value);
        return satisfiedBuilder;
      },
      withServiceType: value => {
        pushParam(params, SERVICE_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withCreateRoute: value => {
        pushParam(params, CREATE_ROUTE_PARAM, value);
        return satisfiedBuilder;
      },
      withRouteHostname: value => {
        pushParam(params, ROUTE_HOSTNAME_PARAM, value);
        return satisfiedBuilder;
      },
      withRouteTlsTermination: value => {
        pushParam(params, ROUTE_TLS_TERMINATION_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: OpenshiftServiceConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withName(config.name);

    if (config.description) b.withDescription(config.description);
    if (config.port !== undefined) b.withPort(config.port);
    if (config.targetPort !== undefined) b.withTargetPort(config.targetPort);
    if (config.protocol) b.withProtocol(config.protocol);
    if (config.serviceType) b.withServiceType(config.serviceType);
    if (config.createRoute !== undefined) b.withCreateRoute(config.createRoute);
    if (config.routeHostname) b.withRouteHostname(config.routeHostname);
    if (config.routeTlsTermination)
      b.withRouteTlsTermination(config.routeTlsTermination);

    return b.build();
  };
}
