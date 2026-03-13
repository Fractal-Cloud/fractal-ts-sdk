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
import {VERSION_PARAM} from '../../../../fractal/component/storage/paas/relational_dbms';

// BFF offer id: Storage.PaaS.PostgreSqlDbms (shared across providers)
const GCP_POSTGRESQL_DBMS_TYPE_NAME = 'PostgreSqlDbms';
const REGION_PARAM = 'region';
const TIER_PARAM = 'tier';
const STORAGE_AUTO_RESIZE_PARAM = 'storageAutoResize';

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

function buildType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(GCP_POSTGRESQL_DBMS_TYPE_NAME)
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
 * dependencies, links, dbVersion) are locked to the blueprint.
 */
export type SatisfiedGcpPostgreSqlDbmsBuilder = {
  withRegion: (region: string) => SatisfiedGcpPostgreSqlDbmsBuilder;
  withTier: (tier: string) => SatisfiedGcpPostgreSqlDbmsBuilder;
  withStorageAutoResize: (
    enabled: boolean,
  ) => SatisfiedGcpPostgreSqlDbmsBuilder;
  build: () => LiveSystemComponent;
};

export type GcpPostgreSqlDbmsBuilder = {
  withId: (id: string) => GcpPostgreSqlDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpPostgreSqlDbmsBuilder;
  withDisplayName: (displayName: string) => GcpPostgreSqlDbmsBuilder;
  withDescription: (description: string) => GcpPostgreSqlDbmsBuilder;
  withDbVersion: (version: string) => GcpPostgreSqlDbmsBuilder;
  withRegion: (region: string) => GcpPostgreSqlDbmsBuilder;
  withTier: (tier: string) => GcpPostgreSqlDbmsBuilder;
  withStorageAutoResize: (enabled: boolean) => GcpPostgreSqlDbmsBuilder;
  build: () => LiveSystemComponent;
};

export type GcpPostgreSqlDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  dbVersion?: string;
  region: string;
  tier?: string;
  storageAutoResize?: boolean;
};

export namespace GcpPostgreSqlDbms {
  export const getBuilder = (): GcpPostgreSqlDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpPostgreSqlDbmsBuilder = {
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
      withDbVersion: value => {
        pushParam(params, VERSION_PARAM, value);
        return builder;
      },
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return builder;
      },
      withTier: value => {
        pushParam(params, TIER_PARAM, value);
        return builder;
      },
      withStorageAutoResize: value => {
        pushParam(params, STORAGE_AUTO_RESIZE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpPostgreSqlDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
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

    const dbVersion =
      blueprint.parameters.getOptionalFieldByName(VERSION_PARAM);
    if (dbVersion !== null) pushParam(params, VERSION_PARAM, String(dbVersion));

    const satisfiedBuilder: SatisfiedGcpPostgreSqlDbmsBuilder = {
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withTier: value => {
        pushParam(params, TIER_PARAM, value);
        return satisfiedBuilder;
      },
      withStorageAutoResize: value => {
        pushParam(params, STORAGE_AUTO_RESIZE_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: GcpPostgreSqlDbmsConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withRegion(config.region);

    if (config.description) b.withDescription(config.description);
    if (config.dbVersion) b.withDbVersion(config.dbVersion);
    if (config.tier) b.withTier(config.tier);
    if (config.storageAutoResize !== undefined)
      b.withStorageAutoResize(config.storageAutoResize);

    return b.build();
  };
}
