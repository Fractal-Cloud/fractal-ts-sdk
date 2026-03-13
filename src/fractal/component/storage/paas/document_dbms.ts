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
import {DocumentDatabaseComponent} from './document_database';

export const DOCUMENT_DBMS_TYPE_NAME = 'DocumentDbms';

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

function buildDocumentDbmsType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(DOCUMENT_DBMS_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DocumentDbmsComponent = {
  readonly dbms: BlueprintComponent;
  readonly databases: ReadonlyArray<DocumentDatabaseComponent>;
  withDatabases: (
    databases: DocumentDatabaseComponent[],
  ) => DocumentDbmsComponent;
};

export type DocumentDbmsBuilder = {
  withId: (id: string) => DocumentDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => DocumentDbmsBuilder;
  withDisplayName: (displayName: string) => DocumentDbmsBuilder;
  withDescription: (description: string) => DocumentDbmsBuilder;
  build: () => BlueprintComponent;
};

export type DocumentDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeDocumentDbmsComponent(
  dbms: BlueprintComponent,
  dbNodes: DocumentDatabaseComponent[],
): DocumentDbmsComponent {
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
      makeDocumentDbmsComponent(dbms, newDatabases),
  };
}

export namespace DocumentDbms {
  export const getBuilder = (): DocumentDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildDocumentDbmsType())
      .withParameters(params);

    const builder: DocumentDbmsBuilder = {
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

  export const create = (config: DocumentDbmsConfig): DocumentDbmsComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeDocumentDbmsComponent(b.build(), []);
  };
}
