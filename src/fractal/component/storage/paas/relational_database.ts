import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
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

export const RELATIONAL_DATABASE_TYPE_NAME = 'RelationalDatabase';
export const COLLATION_PARAM = 'collation';
export const CHARSET_PARAM = 'charset';

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

function buildRelationalDatabaseType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(RELATIONAL_DATABASE_TYPE_NAME)
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

export type RelationalDatabaseComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type RelationalDatabaseBuilder = {
  withId: (id: string) => RelationalDatabaseBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => RelationalDatabaseBuilder;
  withDisplayName: (displayName: string) => RelationalDatabaseBuilder;
  withDescription: (description: string) => RelationalDatabaseBuilder;
  withCollation: (collation: string) => RelationalDatabaseBuilder;
  withCharset: (charset: string) => RelationalDatabaseBuilder;
  build: () => BlueprintComponent;
};

export type RelationalDatabaseConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  collation?: string;
  charset?: string;
};

function makeRelationalDatabaseComponent(
  component: BlueprintComponent,
): RelationalDatabaseComponent {
  return {component, components: [component]};
}

export namespace RelationalDatabase {
  export const getBuilder = (): RelationalDatabaseBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildRelationalDatabaseType())
      .withParameters(params);

    const builder: RelationalDatabaseBuilder = {
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
      withCollation: collation => {
        pushParam(params, COLLATION_PARAM, collation);
        return builder;
      },
      withCharset: charset => {
        pushParam(params, CHARSET_PARAM, charset);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (
    config: RelationalDatabaseConfig,
  ): RelationalDatabaseComponent => {
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

    return makeRelationalDatabaseComponent(b.build());
  };
}
