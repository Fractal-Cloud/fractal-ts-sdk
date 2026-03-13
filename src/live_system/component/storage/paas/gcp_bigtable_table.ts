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

// Agent constant: BIGTABLE_TABLE_COMPONENT_NAME = "BigTableTable"
const BIGTABLE_TABLE_TYPE_NAME = 'BigTableTable';
const TABLE_ID_PARAM = 'tableId';
const COLUMN_FAMILIES_PARAM = 'columnFamilies';
const SPLIT_KEYS_PARAM = 'splitKeys';

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
      PascalCaseString.getBuilder().withValue(BIGTABLE_TABLE_TYPE_NAME).build(),
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

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint.
 */
export type SatisfiedGcpBigTableTableBuilder = {
  withTableId: (tableId: string) => SatisfiedGcpBigTableTableBuilder;
  withColumnFamilies: (families: string[]) => SatisfiedGcpBigTableTableBuilder;
  withSplitKeys: (keys: string[]) => SatisfiedGcpBigTableTableBuilder;
  build: () => LiveSystemComponent;
};

export type GcpBigTableTableBuilder = {
  withId: (id: string) => GcpBigTableTableBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpBigTableTableBuilder;
  withDisplayName: (displayName: string) => GcpBigTableTableBuilder;
  withDescription: (description: string) => GcpBigTableTableBuilder;
  withTableId: (tableId: string) => GcpBigTableTableBuilder;
  withColumnFamilies: (families: string[]) => GcpBigTableTableBuilder;
  withSplitKeys: (keys: string[]) => GcpBigTableTableBuilder;
  build: () => LiveSystemComponent;
};

export type GcpBigTableTableConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  tableId?: string;
  columnFamilies?: string[];
  splitKeys?: string[];
};

export namespace GcpBigTableTable {
  export const getBuilder = (): GcpBigTableTableBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpBigTableTableBuilder = {
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
      withTableId: value => {
        pushParam(params, TABLE_ID_PARAM, value);
        return builder;
      },
      withColumnFamilies: value => {
        pushParam(params, COLUMN_FAMILIES_PARAM, value);
        return builder;
      },
      withSplitKeys: value => {
        pushParam(params, SPLIT_KEYS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpBigTableTableBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP')
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

    const satisfiedBuilder: SatisfiedGcpBigTableTableBuilder = {
      withTableId: value => {
        pushParam(params, TABLE_ID_PARAM, value);
        return satisfiedBuilder;
      },
      withColumnFamilies: value => {
        pushParam(params, COLUMN_FAMILIES_PARAM, value);
        return satisfiedBuilder;
      },
      withSplitKeys: value => {
        pushParam(params, SPLIT_KEYS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (
    config: GcpBigTableTableConfig,
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
    if (config.tableId) b.withTableId(config.tableId);
    if (config.columnFamilies) b.withColumnFamilies(config.columnFamilies);
    if (config.splitKeys) b.withSplitKeys(config.splitKeys);

    return b.build();
  };
}
