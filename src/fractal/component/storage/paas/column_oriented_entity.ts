import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {getParametersInstance} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {BlueprintComponent} from '../../index';

export const COLUMN_ORIENTED_ENTITY_TYPE_NAME = 'ColumnOrientedEntity';

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

function buildColumnOrientedEntityType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(COLUMN_ORIENTED_ENTITY_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type ColumnOrientedEntityComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type ColumnOrientedEntityBuilder = {
  withId: (id: string) => ColumnOrientedEntityBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ColumnOrientedEntityBuilder;
  withDisplayName: (displayName: string) => ColumnOrientedEntityBuilder;
  withDescription: (description: string) => ColumnOrientedEntityBuilder;
  build: () => BlueprintComponent;
};

export type ColumnOrientedEntityConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeColumnOrientedEntityComponent(
  component: BlueprintComponent,
): ColumnOrientedEntityComponent {
  return {component, components: [component]};
}

export namespace ColumnOrientedEntity {
  export const getBuilder = (): ColumnOrientedEntityBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildColumnOrientedEntityType())
      .withParameters(getParametersInstance());

    const builder: ColumnOrientedEntityBuilder = {
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
    config: ColumnOrientedEntityConfig,
  ): ColumnOrientedEntityComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeColumnOrientedEntityComponent(b.build());
  };
}
