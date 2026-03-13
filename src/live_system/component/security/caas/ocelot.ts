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

// Agent constant: OCELOT_COMPONENT_NAME = "Ocelot"
const OCELOT_TYPE_NAME = 'Ocelot';
export const NAMESPACE_PARAM = 'namespace';
export const COOKIE_MAX_AGE_SEC_PARAM = 'cookieMaxAgeSec';
export const CORS_ORIGINS_PARAM = 'corsOrigins';
export const HOST_OWNER_EMAIL_PARAM = 'hostOwnerEmail';
export const HOST_PARAM = 'host';

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

function buildOcelotType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Security)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(PascalCaseString.getBuilder().withValue(OCELOT_TYPE_NAME).build())
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
export type SatisfiedOcelotBuilder = {
  withNamespace: (namespace: string) => SatisfiedOcelotBuilder;
  withCookieMaxAgeSec: (seconds: number) => SatisfiedOcelotBuilder;
  withCorsOrigins: (origins: string) => SatisfiedOcelotBuilder;
  withHostOwnerEmail: (email: string) => SatisfiedOcelotBuilder;
  withHost: (host: string) => SatisfiedOcelotBuilder;
  build: () => LiveSystemComponent;
};

export type OcelotBuilder = {
  withId: (id: string) => OcelotBuilder;
  withVersion: (major: number, minor: number, patch: number) => OcelotBuilder;
  withDisplayName: (displayName: string) => OcelotBuilder;
  withDescription: (description: string) => OcelotBuilder;
  withNamespace: (namespace: string) => OcelotBuilder;
  withCookieMaxAgeSec: (seconds: number) => OcelotBuilder;
  withCorsOrigins: (origins: string) => OcelotBuilder;
  withHostOwnerEmail: (email: string) => OcelotBuilder;
  withHost: (host: string) => OcelotBuilder;
  build: () => LiveSystemComponent;
};

export type OcelotConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  cookieMaxAgeSec?: number;
  corsOrigins?: string;
  hostOwnerEmail?: string;
  host?: string;
};

export namespace Ocelot {
  export const getBuilder = (): OcelotBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOcelotType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: OcelotBuilder = {
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
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return builder;
      },
      withCookieMaxAgeSec: value => {
        pushParam(params, COOKIE_MAX_AGE_SEC_PARAM, value);
        return builder;
      },
      withCorsOrigins: value => {
        pushParam(params, CORS_ORIGINS_PARAM, value);
        return builder;
      },
      withHostOwnerEmail: value => {
        pushParam(params, HOST_OWNER_EMAIL_PARAM, value);
        return builder;
      },
      withHost: value => {
        pushParam(params, HOST_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedOcelotBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildOcelotType())
      .withParameters(params)
      .withProvider('CaaS')
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

    const satisfiedBuilder: SatisfiedOcelotBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withCookieMaxAgeSec: value => {
        pushParam(params, COOKIE_MAX_AGE_SEC_PARAM, value);
        return satisfiedBuilder;
      },
      withCorsOrigins: value => {
        pushParam(params, CORS_ORIGINS_PARAM, value);
        return satisfiedBuilder;
      },
      withHostOwnerEmail: value => {
        pushParam(params, HOST_OWNER_EMAIL_PARAM, value);
        return satisfiedBuilder;
      },
      withHost: value => {
        pushParam(params, HOST_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: OcelotConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.namespace) b.withNamespace(config.namespace);
    if (config.cookieMaxAgeSec !== undefined)
      b.withCookieMaxAgeSec(config.cookieMaxAgeSec);
    if (config.corsOrigins) b.withCorsOrigins(config.corsOrigins);
    if (config.hostOwnerEmail) b.withHostOwnerEmail(config.hostOwnerEmail);
    if (config.host) b.withHost(config.host);

    return b.build();
  };
}
