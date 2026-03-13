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

// Agent constant: AMBASSADOR_COMPONENT_NAME = "Ambassador"
const AMBASSADOR_TYPE_NAME = 'Ambassador';
export const NAMESPACE_PARAM = 'namespace';
export const HOST_PARAM = 'host';
export const HOST_OWNER_EMAIL_PARAM = 'hostOwnerEmail';
export const ACME_PROVIDER_AUTHORITY_PARAM = 'acmeProviderAuthority';
export const TLS_SECRET_NAME_PARAM = 'tlsSecretName';
export const LICENSE_KEY_PARAM = 'licenseKey';

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

function buildAmbassadorType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AMBASSADOR_TYPE_NAME).build(),
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
export type SatisfiedAmbassadorBuilder = {
  withNamespace: (namespace: string) => SatisfiedAmbassadorBuilder;
  withHost: (host: string) => SatisfiedAmbassadorBuilder;
  withHostOwnerEmail: (email: string) => SatisfiedAmbassadorBuilder;
  withAcmeProviderAuthority: (authority: string) => SatisfiedAmbassadorBuilder;
  withTlsSecretName: (name: string) => SatisfiedAmbassadorBuilder;
  withLicenseKey: (key: string) => SatisfiedAmbassadorBuilder;
  build: () => LiveSystemComponent;
};

export type AmbassadorBuilder = {
  withId: (id: string) => AmbassadorBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AmbassadorBuilder;
  withDisplayName: (displayName: string) => AmbassadorBuilder;
  withDescription: (description: string) => AmbassadorBuilder;
  withNamespace: (namespace: string) => AmbassadorBuilder;
  withHost: (host: string) => AmbassadorBuilder;
  withHostOwnerEmail: (email: string) => AmbassadorBuilder;
  withAcmeProviderAuthority: (authority: string) => AmbassadorBuilder;
  withTlsSecretName: (name: string) => AmbassadorBuilder;
  withLicenseKey: (key: string) => AmbassadorBuilder;
  build: () => LiveSystemComponent;
};

export type AmbassadorConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  namespace?: string;
  host?: string;
  hostOwnerEmail?: string;
  acmeProviderAuthority?: string;
  tlsSecretName?: string;
  licenseKey?: string;
};

export namespace Ambassador {
  export const getBuilder = (): AmbassadorBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAmbassadorType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: AmbassadorBuilder = {
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
      withHost: value => {
        pushParam(params, HOST_PARAM, value);
        return builder;
      },
      withHostOwnerEmail: value => {
        pushParam(params, HOST_OWNER_EMAIL_PARAM, value);
        return builder;
      },
      withAcmeProviderAuthority: value => {
        pushParam(params, ACME_PROVIDER_AUTHORITY_PARAM, value);
        return builder;
      },
      withTlsSecretName: value => {
        pushParam(params, TLS_SECRET_NAME_PARAM, value);
        return builder;
      },
      withLicenseKey: value => {
        pushParam(params, LICENSE_KEY_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAmbassadorBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAmbassadorType())
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

    const satisfiedBuilder: SatisfiedAmbassadorBuilder = {
      withNamespace: value => {
        pushParam(params, NAMESPACE_PARAM, value);
        return satisfiedBuilder;
      },
      withHost: value => {
        pushParam(params, HOST_PARAM, value);
        return satisfiedBuilder;
      },
      withHostOwnerEmail: value => {
        pushParam(params, HOST_OWNER_EMAIL_PARAM, value);
        return satisfiedBuilder;
      },
      withAcmeProviderAuthority: value => {
        pushParam(params, ACME_PROVIDER_AUTHORITY_PARAM, value);
        return satisfiedBuilder;
      },
      withTlsSecretName: value => {
        pushParam(params, TLS_SECRET_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withLicenseKey: value => {
        pushParam(params, LICENSE_KEY_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AmbassadorConfig): LiveSystemComponent => {
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
    if (config.host) b.withHost(config.host);
    if (config.hostOwnerEmail) b.withHostOwnerEmail(config.hostOwnerEmail);
    if (config.acmeProviderAuthority)
      b.withAcmeProviderAuthority(config.acmeProviderAuthority);
    if (config.tlsSecretName) b.withTlsSecretName(config.tlsSecretName);
    if (config.licenseKey) b.withLicenseKey(config.licenseKey);

    return b.build();
  };
}
