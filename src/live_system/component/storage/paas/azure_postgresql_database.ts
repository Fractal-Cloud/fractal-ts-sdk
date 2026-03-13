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
import {
  COLLATION_PARAM,
  CHARSET_PARAM,
} from '../../../../fractal/component/storage/paas/relational_database';

const AZURE_POSTGRESQL_DATABASE_TYPE_NAME = 'PostgreSqlDatabase';

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
        .withValue(AZURE_POSTGRESQL_DATABASE_TYPE_NAME)
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

export type SatisfiedAzurePostgreSqlDatabaseBuilder = {
  build: () => LiveSystemComponent;
};

export type AzurePostgreSqlDatabaseBuilder = {
  withId: (id: string) => AzurePostgreSqlDatabaseBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzurePostgreSqlDatabaseBuilder;
  withDisplayName: (displayName: string) => AzurePostgreSqlDatabaseBuilder;
  withDescription: (description: string) => AzurePostgreSqlDatabaseBuilder;
  withCollation: (collation: string) => AzurePostgreSqlDatabaseBuilder;
  withCharset: (charset: string) => AzurePostgreSqlDatabaseBuilder;
  build: () => LiveSystemComponent;
};

export type AzurePostgreSqlDatabaseConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  collation?: string;
  charset?: string;
};

export namespace AzurePostgreSqlDatabase {
  export const getBuilder = (): AzurePostgreSqlDatabaseBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzurePostgreSqlDatabaseBuilder = {
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
      withCollation: value => {
        pushParam(params, COLLATION_PARAM, value);
        return builder;
      },
      withCharset: value => {
        pushParam(params, CHARSET_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzurePostgreSqlDatabaseBuilder => {
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

    const collation =
      blueprint.parameters.getOptionalFieldByName(COLLATION_PARAM);
    if (collation !== null)
      pushParam(params, COLLATION_PARAM, String(collation));

    const charset = blueprint.parameters.getOptionalFieldByName(CHARSET_PARAM);
    if (charset !== null) pushParam(params, CHARSET_PARAM, String(charset));

    const satisfiedBuilder: SatisfiedAzurePostgreSqlDatabaseBuilder = {
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: AzurePostgreSqlDatabaseConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.collation) b.withCollation(config.collation);
    if (config.charset) b.withCharset(config.charset);

    return b.build();
  };
}
