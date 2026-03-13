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

// Agent constant: BIGTABLE_COMPONENT_NAME = "BigTable"
const BIGTABLE_TYPE_NAME = 'BigTable';
const REGION_PARAM = 'region';
const INSTANCE_TYPE_PARAM = 'instanceType';
const STORAGE_TYPE_PARAM = 'storageType';
const CLUSTER_NODE_COUNT_PARAM = 'clusterNodeCount';
const REPLICATION_ENABLED_PARAM = 'replicationEnabled';

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
      PascalCaseString.getBuilder().withValue(BIGTABLE_TYPE_NAME).build(),
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
export type SatisfiedGcpBigTableBuilder = {
  withRegion: (region: string) => SatisfiedGcpBigTableBuilder;
  withInstanceType: (instanceType: string) => SatisfiedGcpBigTableBuilder;
  withStorageType: (storageType: string) => SatisfiedGcpBigTableBuilder;
  withClusterNodeCount: (count: number) => SatisfiedGcpBigTableBuilder;
  withReplicationEnabled: (enabled: boolean) => SatisfiedGcpBigTableBuilder;
  build: () => LiveSystemComponent;
};

export type GcpBigTableBuilder = {
  withId: (id: string) => GcpBigTableBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpBigTableBuilder;
  withDisplayName: (displayName: string) => GcpBigTableBuilder;
  withDescription: (description: string) => GcpBigTableBuilder;
  withRegion: (region: string) => GcpBigTableBuilder;
  withInstanceType: (instanceType: string) => GcpBigTableBuilder;
  withStorageType: (storageType: string) => GcpBigTableBuilder;
  withClusterNodeCount: (count: number) => GcpBigTableBuilder;
  withReplicationEnabled: (enabled: boolean) => GcpBigTableBuilder;
  build: () => LiveSystemComponent;
};

export type GcpBigTableConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  region: string;
  instanceType?: string;
  storageType?: string;
  clusterNodeCount?: number;
  replicationEnabled?: boolean;
};

export namespace GcpBigTable {
  export const getBuilder = (): GcpBigTableBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpBigTableBuilder = {
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
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return builder;
      },
      withInstanceType: value => {
        pushParam(params, INSTANCE_TYPE_PARAM, value);
        return builder;
      },
      withStorageType: value => {
        pushParam(params, STORAGE_TYPE_PARAM, value);
        return builder;
      },
      withClusterNodeCount: value => {
        pushParam(params, CLUSTER_NODE_COUNT_PARAM, value);
        return builder;
      },
      withReplicationEnabled: value => {
        pushParam(params, REPLICATION_ENABLED_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpBigTableBuilder => {
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

    const satisfiedBuilder: SatisfiedGcpBigTableBuilder = {
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withInstanceType: value => {
        pushParam(params, INSTANCE_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withStorageType: value => {
        pushParam(params, STORAGE_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      withClusterNodeCount: value => {
        pushParam(params, CLUSTER_NODE_COUNT_PARAM, value);
        return satisfiedBuilder;
      },
      withReplicationEnabled: value => {
        pushParam(params, REPLICATION_ENABLED_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpBigTableConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withRegion(config.region);

    if (config.description) b.withDescription(config.description);
    if (config.instanceType) b.withInstanceType(config.instanceType);
    if (config.storageType) b.withStorageType(config.storageType);
    if (config.clusterNodeCount !== undefined)
      b.withClusterNodeCount(config.clusterNodeCount);
    if (config.replicationEnabled !== undefined)
      b.withReplicationEnabled(config.replicationEnabled);

    return b.build();
  };
}
