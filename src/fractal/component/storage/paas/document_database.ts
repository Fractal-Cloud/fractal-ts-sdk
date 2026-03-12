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

export const DOCUMENT_DATABASE_TYPE_NAME = 'DocumentDatabase';

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

function buildDocumentDatabaseType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(DOCUMENT_DATABASE_TYPE_NAME)
        .build(),
    )
    .build();
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DocumentDatabaseComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type DocumentDatabaseBuilder = {
  withId: (id: string) => DocumentDatabaseBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => DocumentDatabaseBuilder;
  withDisplayName: (displayName: string) => DocumentDatabaseBuilder;
  withDescription: (description: string) => DocumentDatabaseBuilder;
  build: () => BlueprintComponent;
};

export type DocumentDatabaseConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
};

function makeDocumentDatabaseComponent(
  component: BlueprintComponent,
): DocumentDatabaseComponent {
  return {component, components: [component]};
}

export namespace DocumentDatabase {
  export const getBuilder = (): DocumentDatabaseBuilder => {
    const inner = getBlueprintComponentBuilder()
      .withType(buildDocumentDatabaseType())
      .withParameters(getParametersInstance());

    const builder: DocumentDatabaseBuilder = {
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
    config: DocumentDatabaseConfig,
  ): DocumentDatabaseComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);

    return makeDocumentDatabaseComponent(b.build());
  };
}
