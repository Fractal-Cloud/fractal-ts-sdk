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

// Agent constant: CLOUD_STORAGE_COMPONENT_NAME = "CloudStorage"
const CLOUD_STORAGE_TYPE_NAME = 'CloudStorage';
const BUCKET_NAME_PARAM = 'bucketName';
const REGION_PARAM = 'region';
const STORAGE_CLASS_PARAM = 'storageClass';
const VERSIONING_ENABLED_PARAM = 'versioningEnabled';
const UNIFORM_BUCKET_LEVEL_ACCESS_PARAM = 'uniformBucketLevelAccess';

// -- internal helpers ----------------------------------------------------------

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
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(CLOUD_STORAGE_TYPE_NAME).build(),
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

// -- Public API ----------------------------------------------------------------

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedGcpDatalakeBuilder = {
  withBucketName: (bucketName: string) => SatisfiedGcpDatalakeBuilder;
  withRegion: (region: string) => SatisfiedGcpDatalakeBuilder;
  withStorageClass: (storageClass: string) => SatisfiedGcpDatalakeBuilder;
  withVersioningEnabled: (enabled: boolean) => SatisfiedGcpDatalakeBuilder;
  withUniformBucketLevelAccess: (
    enabled: boolean,
  ) => SatisfiedGcpDatalakeBuilder;
  build: () => LiveSystemComponent;
};

export type GcpDatalakeBuilder = {
  withId: (id: string) => GcpDatalakeBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => GcpDatalakeBuilder;
  withDisplayName: (displayName: string) => GcpDatalakeBuilder;
  withDescription: (description: string) => GcpDatalakeBuilder;
  withBucketName: (bucketName: string) => GcpDatalakeBuilder;
  withRegion: (region: string) => GcpDatalakeBuilder;
  withStorageClass: (storageClass: string) => GcpDatalakeBuilder;
  withVersioningEnabled: (enabled: boolean) => GcpDatalakeBuilder;
  withUniformBucketLevelAccess: (enabled: boolean) => GcpDatalakeBuilder;
  build: () => LiveSystemComponent;
};

export type GcpDatalakeConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  bucketName?: string;
  region?: string;
  storageClass?: string;
  versioningEnabled?: boolean;
  uniformBucketLevelAccess?: boolean;
};

export namespace GcpDatalake {
  export const getBuilder = (): GcpDatalakeBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('GCP');

    const builder: GcpDatalakeBuilder = {
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
      withBucketName: value => {
        pushParam(params, BUCKET_NAME_PARAM, value);
        return builder;
      },
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return builder;
      },
      withStorageClass: value => {
        pushParam(params, STORAGE_CLASS_PARAM, value);
        return builder;
      },
      withVersioningEnabled: value => {
        pushParam(params, VERSIONING_ENABLED_PARAM, value);
        return builder;
      },
      withUniformBucketLevelAccess: value => {
        pushParam(params, UNIFORM_BUCKET_LEVEL_ACCESS_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedGcpDatalakeBuilder => {
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

    const satisfiedBuilder: SatisfiedGcpDatalakeBuilder = {
      withBucketName: value => {
        pushParam(params, BUCKET_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withRegion: value => {
        pushParam(params, REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withStorageClass: value => {
        pushParam(params, STORAGE_CLASS_PARAM, value);
        return satisfiedBuilder;
      },
      withVersioningEnabled: value => {
        pushParam(params, VERSIONING_ENABLED_PARAM, value);
        return satisfiedBuilder;
      },
      withUniformBucketLevelAccess: value => {
        pushParam(params, UNIFORM_BUCKET_LEVEL_ACCESS_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: GcpDatalakeConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.bucketName) b.withBucketName(config.bucketName);
    if (config.region) b.withRegion(config.region);
    if (config.storageClass) b.withStorageClass(config.storageClass);
    if (config.versioningEnabled !== undefined)
      b.withVersioningEnabled(config.versioningEnabled);
    if (config.uniformBucketLevelAccess !== undefined)
      b.withUniformBucketLevelAccess(config.uniformBucketLevelAccess);

    return b.build();
  };
}
