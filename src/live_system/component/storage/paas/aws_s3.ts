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

// Agent constant: S3_COMPONENT_NAME = "S3"
const AWS_S3_TYPE_NAME = 'S3';
const BUCKET_PARAM = 'bucket';
const ACL_PARAM = 'acl';
const FORCE_DESTROY_PARAM = 'forceDestroy';
const VERSIONING_ENABLED_PARAM = 'versioningEnabled';
const OBJECT_LOCK_ENABLED_PARAM = 'objectLockEnabled';

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

function buildAwsS3Type(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(PascalCaseString.getBuilder().withValue(AWS_S3_TYPE_NAME).build())
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
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedAwsS3Builder = {
  withBucket: (bucket: string) => SatisfiedAwsS3Builder;
  withAcl: (acl: string) => SatisfiedAwsS3Builder;
  withForceDestroy: (forceDestroy: boolean) => SatisfiedAwsS3Builder;
  withVersioningEnabled: (enabled: boolean) => SatisfiedAwsS3Builder;
  withObjectLockEnabled: (enabled: boolean) => SatisfiedAwsS3Builder;
  build: () => LiveSystemComponent;
};

export type AwsS3Builder = {
  withId: (id: string) => AwsS3Builder;
  withVersion: (major: number, minor: number, patch: number) => AwsS3Builder;
  withDisplayName: (displayName: string) => AwsS3Builder;
  withDescription: (description: string) => AwsS3Builder;
  withBucket: (bucket: string) => AwsS3Builder;
  withAcl: (acl: string) => AwsS3Builder;
  withForceDestroy: (forceDestroy: boolean) => AwsS3Builder;
  withVersioningEnabled: (enabled: boolean) => AwsS3Builder;
  withObjectLockEnabled: (enabled: boolean) => AwsS3Builder;
  build: () => LiveSystemComponent;
};

export type AwsS3Config = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  bucket?: string;
  acl?: string;
  forceDestroy?: boolean;
  versioningEnabled?: boolean;
  objectLockEnabled?: boolean;
};

export namespace AwsS3 {
  export const getBuilder = (): AwsS3Builder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsS3Type())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsS3Builder = {
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
      withBucket: value => {
        pushParam(params, BUCKET_PARAM, value);
        return builder;
      },
      withAcl: value => {
        pushParam(params, ACL_PARAM, value);
        return builder;
      },
      withForceDestroy: value => {
        pushParam(params, FORCE_DESTROY_PARAM, value);
        return builder;
      },
      withVersioningEnabled: value => {
        pushParam(params, VERSIONING_ENABLED_PARAM, value);
        return builder;
      },
      withObjectLockEnabled: value => {
        pushParam(params, OBJECT_LOCK_ENABLED_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsS3Builder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsS3Type())
      .withParameters(params)
      .withProvider('AWS')
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

    const satisfiedBuilder: SatisfiedAwsS3Builder = {
      withBucket: value => {
        pushParam(params, BUCKET_PARAM, value);
        return satisfiedBuilder;
      },
      withAcl: value => {
        pushParam(params, ACL_PARAM, value);
        return satisfiedBuilder;
      },
      withForceDestroy: value => {
        pushParam(params, FORCE_DESTROY_PARAM, value);
        return satisfiedBuilder;
      },
      withVersioningEnabled: value => {
        pushParam(params, VERSIONING_ENABLED_PARAM, value);
        return satisfiedBuilder;
      },
      withObjectLockEnabled: value => {
        pushParam(params, OBJECT_LOCK_ENABLED_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsS3Config): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.bucket) b.withBucket(config.bucket);
    if (config.acl) b.withAcl(config.acl);
    if (config.forceDestroy !== undefined)
      b.withForceDestroy(config.forceDestroy);
    if (config.versioningEnabled !== undefined)
      b.withVersioningEnabled(config.versioningEnabled);
    if (config.objectLockEnabled !== undefined)
      b.withObjectLockEnabled(config.objectLockEnabled);

    return b.build();
  };
}
