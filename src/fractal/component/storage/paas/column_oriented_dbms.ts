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
import {ColumnOrientedEntityComponent} from './column_oriented_entity';

export const COLUMN_ORIENTED_DBMS_TYPE_NAME = 'ColumnOrientedDbms';

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

function buildColumnOrientedDbmsType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(COLUMN_ORIENTED_DBMS_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type ColumnOrientedDbmsComponent = {
  readonly dbms: BlueprintComponent;
  readonly entities: ReadonlyArray<ColumnOrientedEntityComponent>;
  withEntities: (
    entities: ColumnOrientedEntityComponent[],
  ) => ColumnOrientedDbmsComponent;
};

export type ColumnOrientedDbmsBuilder = {
  withId: (id: string) => ColumnOrientedDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ColumnOrientedDbmsBuilder;
  withDisplayName: (displayName: string) => ColumnOrientedDbmsBuilder;
  withDescription: (description: string) => ColumnOrientedDbmsBuilder;
  build: () => BlueprintComponent;
};

export type ColumnOrientedDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeColumnOrientedDbmsComponent(
  dbms: BlueprintComponent,
  entityNodes: ColumnOrientedEntityComponent[],
): ColumnOrientedDbmsComponent {
  const dbmsDep: BlueprintComponentDependency = {id: dbms.id};
  const wiredEntities = entityNodes.map(e => ({
    ...e,
    component: {
      ...e.component,
      dependencies: [...e.component.dependencies, dbmsDep],
    },
  }));
  return {
    dbms,
    entities: wiredEntities,
    withEntities: newEntities =>
      makeColumnOrientedDbmsComponent(dbms, newEntities),
  };
}

export namespace ColumnOrientedDbms {
  export const getBuilder = (): ColumnOrientedDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildColumnOrientedDbmsType())
      .withParameters(params);

    const builder: ColumnOrientedDbmsBuilder = {
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

  export const create = (
    config: ColumnOrientedDbmsConfig,
  ): ColumnOrientedDbmsComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeColumnOrientedDbmsComponent(b.build(), []);
  };
}
