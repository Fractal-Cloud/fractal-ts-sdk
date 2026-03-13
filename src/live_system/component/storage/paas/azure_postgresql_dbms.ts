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

const AZURE_POSTGRESQL_DBMS_TYPE_NAME = 'PostgreSqlDbms';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const ROOT_USER_PARAM = 'rootUser';
const SKU_NAME_PARAM = 'skuName';
const STORAGE_GB_PARAM = 'storageGb';
const BACKUP_RETENTION_DAYS_PARAM = 'backupRetentionDays';

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
        .withValue(AZURE_POSTGRESQL_DBMS_TYPE_NAME)
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

export type SatisfiedAzurePostgreSqlDbmsBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzurePostgreSqlDbmsBuilder;
  withAzureResourceGroup: (rg: string) => SatisfiedAzurePostgreSqlDbmsBuilder;
  withRootUser: (user: string) => SatisfiedAzurePostgreSqlDbmsBuilder;
  withSkuName: (sku: string) => SatisfiedAzurePostgreSqlDbmsBuilder;
  withStorageGb: (gb: number) => SatisfiedAzurePostgreSqlDbmsBuilder;
  withBackupRetentionDays: (
    days: number,
  ) => SatisfiedAzurePostgreSqlDbmsBuilder;
  build: () => LiveSystemComponent;
};

export type AzurePostgreSqlDbmsBuilder = {
  withId: (id: string) => AzurePostgreSqlDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzurePostgreSqlDbmsBuilder;
  withDisplayName: (displayName: string) => AzurePostgreSqlDbmsBuilder;
  withDescription: (description: string) => AzurePostgreSqlDbmsBuilder;
  withDbVersion: (version: string) => AzurePostgreSqlDbmsBuilder;
  withAzureRegion: (region: string) => AzurePostgreSqlDbmsBuilder;
  withAzureResourceGroup: (rg: string) => AzurePostgreSqlDbmsBuilder;
  withRootUser: (user: string) => AzurePostgreSqlDbmsBuilder;
  withSkuName: (sku: string) => AzurePostgreSqlDbmsBuilder;
  withStorageGb: (gb: number) => AzurePostgreSqlDbmsBuilder;
  withBackupRetentionDays: (days: number) => AzurePostgreSqlDbmsBuilder;
  build: () => LiveSystemComponent;
};

export type AzurePostgreSqlDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  dbVersion?: string;
  azureRegion: string;
  azureResourceGroup: string;
  rootUser?: string;
  skuName?: string;
  storageGb?: number;
  backupRetentionDays?: number;
};

export namespace AzurePostgreSqlDbms {
  export const getBuilder = (): AzurePostgreSqlDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzurePostgreSqlDbmsBuilder = {
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
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return builder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return builder;
      },
      withRootUser: value => {
        pushParam(params, ROOT_USER_PARAM, value);
        return builder;
      },
      withSkuName: value => {
        pushParam(params, SKU_NAME_PARAM, value);
        return builder;
      },
      withStorageGb: value => {
        pushParam(params, STORAGE_GB_PARAM, value);
        return builder;
      },
      withBackupRetentionDays: value => {
        pushParam(params, BACKUP_RETENTION_DAYS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzurePostgreSqlDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure')
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

    const satisfiedBuilder: SatisfiedAzurePostgreSqlDbmsBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withRootUser: value => {
        pushParam(params, ROOT_USER_PARAM, value);
        return satisfiedBuilder;
      },
      withSkuName: value => {
        pushParam(params, SKU_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withStorageGb: value => {
        pushParam(params, STORAGE_GB_PARAM, value);
        return satisfiedBuilder;
      },
      withBackupRetentionDays: value => {
        pushParam(params, BACKUP_RETENTION_DAYS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzurePostgreSqlDbmsConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withAzureRegion(config.azureRegion)
      .withAzureResourceGroup(config.azureResourceGroup);

    if (config.description) b.withDescription(config.description);
    if (config.dbVersion) b.withDbVersion(config.dbVersion);
    if (config.rootUser) b.withRootUser(config.rootUser);
    if (config.skuName) b.withSkuName(config.skuName);
    if (config.storageGb !== undefined) b.withStorageGb(config.storageGb);
    if (config.backupRetentionDays !== undefined)
      b.withBackupRetentionDays(config.backupRetentionDays);

    return b.build();
  };
}
