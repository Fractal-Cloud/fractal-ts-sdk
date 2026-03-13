import {getBlueprintComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {BlueprintComponent} from '../../index';
import {BlueprintComponentDependency} from '../../dependency';
import {GraphDatabaseComponent} from './graph_database';

export const GRAPH_DBMS_TYPE_NAME = 'GraphDbms';

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

function buildGraphDbmsType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(GRAPH_DBMS_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type GraphDbmsComponent = {
  readonly dbms: BlueprintComponent;
  readonly databases: ReadonlyArray<GraphDatabaseComponent>;
  withDatabases: (databases: GraphDatabaseComponent[]) => GraphDbmsComponent;
};

export type GraphDbmsBuilder = {
  withId: (id: string) => GraphDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GraphDbmsBuilder;
  withDisplayName: (displayName: string) => GraphDbmsBuilder;
  withDescription: (description: string) => GraphDbmsBuilder;
  build: () => BlueprintComponent;
};

export type GraphDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeGraphDbmsComponent(
  dbms: BlueprintComponent,
  dbNodes: GraphDatabaseComponent[],
): GraphDbmsComponent {
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
    withDatabases: newDatabases => makeGraphDbmsComponent(dbms, newDatabases),
  };
}

export namespace GraphDbms {
  export const getBuilder = (): GraphDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildGraphDbmsType())
      .withParameters(params);

    const builder: GraphDbmsBuilder = {
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
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (config: GraphDbmsConfig): GraphDbmsComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeGraphDbmsComponent(b.build(), []);
  };
}
