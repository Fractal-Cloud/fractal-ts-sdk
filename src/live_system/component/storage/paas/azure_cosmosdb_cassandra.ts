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

const AZURE_COSMOSDB_CASSANDRA_TYPE_NAME = 'CosmosDbCassandra';
const AZURE_REGION_PARAM = 'azureRegion';
const AZURE_RESOURCE_GROUP_PARAM = 'azureResourceGroup';
const CASSANDRA_VERSION_PARAM = 'cassandraVersion';
const HOURS_BETWEEN_BACKUPS_PARAM = 'hoursBetweenBackups';

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
        .withValue(AZURE_COSMOSDB_CASSANDRA_TYPE_NAME)
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

export type SatisfiedAzureCosmosDbCassandraBuilder = {
  withAzureRegion: (region: string) => SatisfiedAzureCosmosDbCassandraBuilder;
  withAzureResourceGroup: (
    rg: string,
  ) => SatisfiedAzureCosmosDbCassandraBuilder;
  withCassandraVersion: (
    version: string,
  ) => SatisfiedAzureCosmosDbCassandraBuilder;
  withHoursBetweenBackups: (
    hours: number,
  ) => SatisfiedAzureCosmosDbCassandraBuilder;
  build: () => LiveSystemComponent;
};

export type AzureCosmosDbCassandraBuilder = {
  withId: (id: string) => AzureCosmosDbCassandraBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureCosmosDbCassandraBuilder;
  withDisplayName: (displayName: string) => AzureCosmosDbCassandraBuilder;
  withDescription: (description: string) => AzureCosmosDbCassandraBuilder;
  withAzureRegion: (region: string) => AzureCosmosDbCassandraBuilder;
  withAzureResourceGroup: (rg: string) => AzureCosmosDbCassandraBuilder;
  withCassandraVersion: (version: string) => AzureCosmosDbCassandraBuilder;
  withHoursBetweenBackups: (hours: number) => AzureCosmosDbCassandraBuilder;
  build: () => LiveSystemComponent;
};

export type AzureCosmosDbCassandraConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  azureRegion: string;
  azureResourceGroup: string;
  cassandraVersion?: string;
  hoursBetweenBackups?: number;
};

export namespace AzureCosmosDbCassandra {
  export const getBuilder = (): AzureCosmosDbCassandraBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureCosmosDbCassandraBuilder = {
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
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return builder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return builder;
      },
      withCassandraVersion: value => {
        pushParam(params, CASSANDRA_VERSION_PARAM, value);
        return builder;
      },
      withHoursBetweenBackups: value => {
        pushParam(params, HOURS_BETWEEN_BACKUPS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureCosmosDbCassandraBuilder => {
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

    const satisfiedBuilder: SatisfiedAzureCosmosDbCassandraBuilder = {
      withAzureRegion: value => {
        pushParam(params, AZURE_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withAzureResourceGroup: value => {
        pushParam(params, AZURE_RESOURCE_GROUP_PARAM, value);
        return satisfiedBuilder;
      },
      withCassandraVersion: value => {
        pushParam(params, CASSANDRA_VERSION_PARAM, value);
        return satisfiedBuilder;
      },
      withHoursBetweenBackups: value => {
        pushParam(params, HOURS_BETWEEN_BACKUPS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzureCosmosDbCassandraConfig,
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
    if (config.cassandraVersion)
      b.withCassandraVersion(config.cassandraVersion);
    if (config.hoursBetweenBackups !== undefined)
      b.withHoursBetweenBackups(config.hoursBetweenBackups);

    return b.build();
  };
}
