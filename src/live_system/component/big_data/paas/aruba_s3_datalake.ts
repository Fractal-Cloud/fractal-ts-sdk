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

// Matches agent offer: Storage.PaaS.ArubaS3Bucket
const ARUBA_S3_BUCKET_TYPE_NAME = 'ArubaS3Bucket';
const BUCKET_NAME_PARAM = 'bucketName';
const REGION_PARAM = 'region';

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

function buildArubaS3BucketType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_S3_BUCKET_TYPE_NAME)
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

export type SatisfiedArubaS3BucketBuilder = {
  withBucketName: (bucketName: string) => SatisfiedArubaS3BucketBuilder;
  withRegion: (region: string) => SatisfiedArubaS3BucketBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaS3BucketBuilder = {
  withId: (id: string) => ArubaS3BucketBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaS3BucketBuilder;
  withDisplayName: (displayName: string) => ArubaS3BucketBuilder;
  withDescription: (description: string) => ArubaS3BucketBuilder;
  withBucketName: (bucketName: string) => ArubaS3BucketBuilder;
  withRegion: (region: string) => ArubaS3BucketBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaS3BucketConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  bucketName?: string;
  region?: string;
};

export namespace ArubaS3Bucket {
  export const getBuilder = (): ArubaS3BucketBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaS3BucketType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaS3BucketBuilder = {
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
      withBucketName: bucketName => {
        pushParam(params, BUCKET_NAME_PARAM, bucketName);
        return builder;
      },
      withRegion: region => {
        pushParam(params, REGION_PARAM, region);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaS3BucketBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildArubaS3BucketType())
      .withParameters(params)
      .withProvider('Aruba')
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

    if (blueprint.description) {
      inner.withDescription(blueprint.description);
    }

    const satisfiedBuilder: SatisfiedArubaS3BucketBuilder = {
      withBucketName: bucketName => {
        pushParam(params, BUCKET_NAME_PARAM, bucketName);
        return satisfiedBuilder;
      },
      withRegion: region => {
        pushParam(params, REGION_PARAM, region);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: ArubaS3BucketConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.bucketName) {
      b.withBucketName(config.bucketName);
    }
    if (config.region) {
      b.withRegion(config.region);
    }

    return b.build();
  };
}
