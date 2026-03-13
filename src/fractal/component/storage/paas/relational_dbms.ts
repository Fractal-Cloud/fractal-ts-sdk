import {getBlueprintComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../type';
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
import {BlueprintComponent} from '../../index';
import {BlueprintComponentDependency} from '../../dependency';
import {RelationalDatabaseComponent} from './relational_database';

export const RELATIONAL_DBMS_TYPE_NAME = 'RelationalDbms';
export const VERSION_PARAM = 'version';

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

function buildRelationalDbmsType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(RELATIONAL_DBMS_TYPE_NAME)
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

export type RelationalDbmsComponent = {
  readonly dbms: BlueprintComponent;
  readonly databases: ReadonlyArray<RelationalDatabaseComponent>;
  withDatabases: (
    databases: RelationalDatabaseComponent[],
  ) => RelationalDbmsComponent;
};

export type RelationalDbmsBuilder = {
  withId: (id: string) => RelationalDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => RelationalDbmsBuilder;
  withDisplayName: (displayName: string) => RelationalDbmsBuilder;
  withDescription: (description: string) => RelationalDbmsBuilder;
  withDbVersion: (version: string) => RelationalDbmsBuilder;
  build: () => BlueprintComponent;
};

export type RelationalDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  dbVersion?: string;
};

function makeRelationalDbmsComponent(
  dbms: BlueprintComponent,
  dbNodes: RelationalDatabaseComponent[],
): RelationalDbmsComponent {
  const dbmsDep: BlueprintComponentDependency = {id: dbms.id};
  const wiredDatabases = dbNodes.map(db => ({
    ...db,
    component: {
      ...db.component,
      dependencies: [...db.component.dependencies, dbmsDep],
    },
  }));
  return {
    dbms,
    databases: wiredDatabases,
    withDatabases: newDatabases =>
      makeRelationalDbmsComponent(dbms, newDatabases),
  };
}

export namespace RelationalDbms {
  export const getBuilder = (): RelationalDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildRelationalDbmsType())
      .withParameters(params);

    const builder: RelationalDbmsBuilder = {
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
      withDbVersion: version => {
        pushParam(params, VERSION_PARAM, version);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: RelationalDbmsConfig,
  ): RelationalDbmsComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.dbVersion) b.withDbVersion(config.dbVersion);

    return makeRelationalDbmsComponent(b.build(), []);
  };
}
