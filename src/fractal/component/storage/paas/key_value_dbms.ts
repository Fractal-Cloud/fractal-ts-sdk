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
import {KeyValueEntityComponent} from './key_value_entity';

export const KEY_VALUE_DBMS_TYPE_NAME = 'KeyValueDbms';

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

function buildKeyValueDbmsType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(KEY_VALUE_DBMS_TYPE_NAME).build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type KeyValueDbmsComponent = {
  readonly dbms: BlueprintComponent;
  readonly entities: ReadonlyArray<KeyValueEntityComponent>;
  withEntities: (entities: KeyValueEntityComponent[]) => KeyValueDbmsComponent;
};

export type KeyValueDbmsBuilder = {
  withId: (id: string) => KeyValueDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => KeyValueDbmsBuilder;
  withDisplayName: (displayName: string) => KeyValueDbmsBuilder;
  withDescription: (description: string) => KeyValueDbmsBuilder;
  build: () => BlueprintComponent;
};

export type KeyValueDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeKeyValueDbmsComponent(
  dbms: BlueprintComponent,
  entityNodes: KeyValueEntityComponent[],
): KeyValueDbmsComponent {
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
    withEntities: newEntities => makeKeyValueDbmsComponent(dbms, newEntities),
  };
}

export namespace KeyValueDbms {
  export const getBuilder = (): KeyValueDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildKeyValueDbmsType())
      .withParameters(params);

    const builder: KeyValueDbmsBuilder = {
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

  export const create = (config: KeyValueDbmsConfig): KeyValueDbmsComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeKeyValueDbmsComponent(b.build(), []);
  };
}
