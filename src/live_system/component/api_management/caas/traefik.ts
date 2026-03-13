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

// Agent constant: TRAEFIK_COMPONENT_NAME = "Traefik"
const TRAEFIK_TYPE_NAME = 'Traefik';
export const NAMESPACE_PARAM = 'namespace';
export const HOSTNAME_PARAM = 'hostname';
export const LOADBALANCER_IP_PARAM = 'loadbalancerIp';
export const OIDC_CLIENT_ID_PARAM = 'oidcClientId';
export const OIDC_CLIENT_SECRET_ID_PARAM = 'oidcClientSecretId';
export const FORWARD_AUTH_SECRET_ID_PARAM = 'forwardAuthSecretId';
export const OIDC_ISSUER_URL_PARAM = 'oidcIssuerUrl';
export const ENTRY_POINTS_PARAM = 'entryPoints';
export const TLS_CERTIFICATES_PARAM = 'tlsCertificates';
export const TLS_SETTINGS_PARAM = 'tlsSettings';
export const SECURITY_HEADERS_SETTINGS_PARAM = 'securityHeadersSettings';

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

function buildTraefikType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(TRAEFIK_TYPE_NAME).build(),
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
export type SatisfiedTraefikBuilder = {
  withNamespace: (namespace: string) => SatisfiedTraefikBuilder;
  withHostname: (hostname: string) => SatisfiedTraefikBuilder;
  withLoadbalancerIp: (ip: string) => SatisfiedTraefikBuilder;
  withOidcClientId: (clientId: string) => SatisfiedTraefikBuilder;
  withOidcClientSecretId: (secretId: string) => SatisfiedTraefikBuilder;
  withForwardAuthSecretId: (secretId: string) => SatisfiedTraefikBuilder;
  withOidcIssuerUrl: (url: string) => SatisfiedTraefikBuilder;
  withEntryPoints: (entryPoints: unknown[]) => SatisfiedTraefikBuilder;
  withTlsCertificates: (certificates: unknown[]) => SatisfiedTraefikBuilder;
  withTlsSettings: (
    settings: Record<string, unknown>,
  ) => SatisfiedTraefikBuilder;
  withSecurityHeadersSettings: (
    settings: Record<string, unknown>,
  ) => SatisfiedTraefikBuilder;
  build: () => LiveSystemComponent;
};

export type TraefikBuilder = {
  withId: (id: string) => TraefikBuilder;
  withVersion: (major: number, minor: number, patch: number) => TraefikBuilder;
  withDisplayName: (displayName: string) => TraefikBuilder;
  withDescription: (description: string) => TraefikBuilder;
  withNamespace: (namespace: string) => TraefikBuilder;
  withHostname: (hostname: string) => TraefikBuilder;
  withLoadbalancerIp: (ip: string) => TraefikBuilder;
  withOidcClientId: (clientId: string) => TraefikBuilder;
  withOidcClientSecretId: (secretId: string) => TraefikBuilder;
  withForwardAuthSecretId: (secretId: string) => TraefikBuilder;
  withOidcIssuerUrl: (url: string) => TraefikBuilder;
  withEntryPoints: (entryPoints: unknown[]) => TraefikBuilder;
  withTlsCertificates: (certificates: unknown[]) => TraefikBuilder;
  withTlsSettings: (settings: Record<string, unknown>) => TraefikBuilder;
  withSecurityHeadersSettings: (
    settings: Record<string, unknown>,
  ) => TraefikBuilder;
  build: () => LiveSystemComponent;
};

export type TraefikConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  hostname?: string;
  loadbalancerIp?: string;
  oidcClientId?: string;
  oidcClientSecretId?: string;
  forwardAuthSecretId?: string;
  oidcIssuerUrl?: string;
  entryPoints?: unknown[];
  tlsCertificates?: unknown[];
  tlsSettings?: Record<string, unknown>;
  securityHeadersSettings?: Record<string, unknown>;
};

export namespace Traefik {
  export const getBuilder = (): TraefikBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildTraefikType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: TraefikBuilder = {
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
      withHostname: value => {
        pushParam(params, HOSTNAME_PARAM, value);
        return builder;
      },
      withLoadbalancerIp: value => {
        pushParam(params, LOADBALANCER_IP_PARAM, value);
        return builder;
      },
      withOidcClientId: value => {
        pushParam(params, OIDC_CLIENT_ID_PARAM, value);
        return builder;
      },
      withOidcClientSecretId: value => {
        pushParam(params, OIDC_CLIENT_SECRET_ID_PARAM, value);
        return builder;
      },
      withForwardAuthSecretId: value => {
        pushParam(params, FORWARD_AUTH_SECRET_ID_PARAM, value);
        return builder;
      },
      withOidcIssuerUrl: value => {
        pushParam(params, OIDC_ISSUER_URL_PARAM, value);
        return builder;
      },
      withEntryPoints: value => {
        pushParam(params, ENTRY_POINTS_PARAM, value);
        return builder;
      },
      withTlsCertificates: value => {
        pushParam(params, TLS_CERTIFICATES_PARAM, value);
        return builder;
      },
      withTlsSettings: value => {
        pushParam(params, TLS_SETTINGS_PARAM, value);
        return builder;
      },
      withSecurityHeadersSettings: value => {
        pushParam(params, SECURITY_HEADERS_SETTINGS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedTraefikBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildTraefikType())
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

    const satisfiedBuilder: SatisfiedTraefikBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withHostname: value => {
        pushParam(params, HOSTNAME_PARAM, value);
        return satisfiedBuilder;
      },
      withLoadbalancerIp: value => {
        pushParam(params, LOADBALANCER_IP_PARAM, value);
        return satisfiedBuilder;
      },
      withOidcClientId: value => {
        pushParam(params, OIDC_CLIENT_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withOidcClientSecretId: value => {
        pushParam(params, OIDC_CLIENT_SECRET_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withForwardAuthSecretId: value => {
        pushParam(params, FORWARD_AUTH_SECRET_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withOidcIssuerUrl: value => {
        pushParam(params, OIDC_ISSUER_URL_PARAM, value);
        return satisfiedBuilder;
      },
      withEntryPoints: value => {
        pushParam(params, ENTRY_POINTS_PARAM, value);
        return satisfiedBuilder;
      },
      withTlsCertificates: value => {
        pushParam(params, TLS_CERTIFICATES_PARAM, value);
        return satisfiedBuilder;
      },
      withTlsSettings: value => {
        pushParam(params, TLS_SETTINGS_PARAM, value);
        return satisfiedBuilder;
      },
      withSecurityHeadersSettings: value => {
        pushParam(params, SECURITY_HEADERS_SETTINGS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: TraefikConfig): LiveSystemComponent => {
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
    if (config.hostname) b.withHostname(config.hostname);
    if (config.loadbalancerIp) b.withLoadbalancerIp(config.loadbalancerIp);
    if (config.oidcClientId) b.withOidcClientId(config.oidcClientId);
    if (config.oidcClientSecretId)
      b.withOidcClientSecretId(config.oidcClientSecretId);
    if (config.forwardAuthSecretId)
      b.withForwardAuthSecretId(config.forwardAuthSecretId);
    if (config.oidcIssuerUrl) b.withOidcIssuerUrl(config.oidcIssuerUrl);
    if (config.entryPoints) b.withEntryPoints(config.entryPoints);
    if (config.tlsCertificates) b.withTlsCertificates(config.tlsCertificates);
    if (config.tlsSettings) b.withTlsSettings(config.tlsSettings);
    if (config.securityHeadersSettings)
      b.withSecurityHeadersSettings(config.securityHeadersSettings);

    return b.build();
  };
}
