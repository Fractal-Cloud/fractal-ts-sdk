import {getLiveSystemComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../../../fractal/component/type';
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

// Agent constant: S3_DATALAKE_COMPONENT_NAME = "S3"
const AWS_S3_DATALAKE_TYPE_NAME = 'S3';
const BUCKET_PARAM = 'bucket';
const VERSIONING_PARAM = 'versioning';
const FORCE_DESTROY_PARAM = 'forceDestroy';

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

function buildAwsS3DatalakeType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.BigData)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(AWS_S3_DATALAKE_TYPE_NAME)
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

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties (id, version, displayName, description,
 * dependencies, links) are locked to the blueprint and cannot be overridden.
 */
export type SatisfiedAwsS3DatalakeBuilder = {
  withBucket: (bucket: string) => SatisfiedAwsS3DatalakeBuilder;
  withVersioning: (versioning: boolean) => SatisfiedAwsS3DatalakeBuilder;
  withForceDestroy: (forceDestroy: boolean) => SatisfiedAwsS3DatalakeBuilder;
  build: () => LiveSystemComponent;
};

export type AwsS3DatalakeBuilder = {
  withId: (id: string) => AwsS3DatalakeBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsS3DatalakeBuilder;
  withDisplayName: (displayName: string) => AwsS3DatalakeBuilder;
  withDescription: (description: string) => AwsS3DatalakeBuilder;
  withBucket: (bucket: string) => AwsS3DatalakeBuilder;
  withVersioning: (versioning: boolean) => AwsS3DatalakeBuilder;
  withForceDestroy: (forceDestroy: boolean) => AwsS3DatalakeBuilder;
  build: () => LiveSystemComponent;
};

export type AwsS3DatalakeConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  bucket?: string;
  versioning?: boolean;
  forceDestroy?: boolean;
};

export namespace AwsS3Datalake {
  export const getBuilder = (): AwsS3DatalakeBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsS3DatalakeType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsS3DatalakeBuilder = {
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
      withBucket: bucket => {
        pushParam(params, BUCKET_PARAM, bucket);
        return builder;
      },
      withVersioning: versioning => {
        pushParam(params, VERSIONING_PARAM, versioning);
        return builder;
      },
      withForceDestroy: forceDestroy => {
        pushParam(params, FORCE_DESTROY_PARAM, forceDestroy);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsS3DatalakeBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsS3DatalakeType())
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

    const satisfiedBuilder: SatisfiedAwsS3DatalakeBuilder = {
      withBucket: bucket => {
        pushParam(params, BUCKET_PARAM, bucket);
        return satisfiedBuilder;
      },
      withVersioning: versioning => {
        pushParam(params, VERSIONING_PARAM, versioning);
        return satisfiedBuilder;
      },
      withForceDestroy: forceDestroy => {
        pushParam(params, FORCE_DESTROY_PARAM, forceDestroy);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsS3DatalakeConfig): LiveSystemComponent => {
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
    if (config.versioning !== undefined) b.withVersioning(config.versioning);
    if (config.forceDestroy !== undefined)
      b.withForceDestroy(config.forceDestroy);

    return b.build();
  };
}
