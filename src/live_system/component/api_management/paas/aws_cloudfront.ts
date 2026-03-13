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

// Agent constant: CLOUDFRONT_COMPONENT_NAME = "CloudFront"
const AWS_CLOUDFRONT_TYPE_NAME = 'CloudFront';
export const AWS_REGION_PARAM = 'awsRegion';
export const API_KEY_SOURCE_PARAM = 'apiKeySource';
export const BINARY_MEDIA_TYPES_PARAM = 'binaryMediaTypes';
export const MINIMUM_COMPRESSION_SIZE_PARAM = 'minimumCompressionSize';
export const DISABLE_EXECUTE_API_ENDPOINT_PARAM = 'disableExecuteApiEndpoint';

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

function buildAwsCloudFrontType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_CLOUDFRONT_TYPE_NAME).build(),
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
export type SatisfiedAwsCloudFrontBuilder = {
  withAwsRegion: (region: string) => SatisfiedAwsCloudFrontBuilder;
  withApiKeySource: (source: string) => SatisfiedAwsCloudFrontBuilder;
  withBinaryMediaTypes: (types: string[]) => SatisfiedAwsCloudFrontBuilder;
  withMinimumCompressionSize: (size: number) => SatisfiedAwsCloudFrontBuilder;
  withDisableExecuteApiEndpoint: (
    disable: boolean,
  ) => SatisfiedAwsCloudFrontBuilder;
  build: () => LiveSystemComponent;
};

export type AwsCloudFrontBuilder = {
  withId: (id: string) => AwsCloudFrontBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsCloudFrontBuilder;
  withDisplayName: (displayName: string) => AwsCloudFrontBuilder;
  withDescription: (description: string) => AwsCloudFrontBuilder;
  withAwsRegion: (region: string) => AwsCloudFrontBuilder;
  withApiKeySource: (source: string) => AwsCloudFrontBuilder;
  withBinaryMediaTypes: (types: string[]) => AwsCloudFrontBuilder;
  withMinimumCompressionSize: (size: number) => AwsCloudFrontBuilder;
  withDisableExecuteApiEndpoint: (disable: boolean) => AwsCloudFrontBuilder;
  build: () => LiveSystemComponent;
};

export type AwsCloudFrontConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  awsRegion?: string;
  apiKeySource?: string;
  binaryMediaTypes?: string[];
  minimumCompressionSize?: number;
  disableExecuteApiEndpoint?: boolean;
};

export namespace AwsCloudFront {
  export const getBuilder = (): AwsCloudFrontBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsCloudFrontType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsCloudFrontBuilder = {
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
      withAwsRegion: value => {
        pushParam(params, AWS_REGION_PARAM, value);
        return builder;
      },
      withApiKeySource: value => {
        pushParam(params, API_KEY_SOURCE_PARAM, value);
        return builder;
      },
      withBinaryMediaTypes: value => {
        pushParam(params, BINARY_MEDIA_TYPES_PARAM, value);
        return builder;
      },
      withMinimumCompressionSize: value => {
        pushParam(params, MINIMUM_COMPRESSION_SIZE_PARAM, value);
        return builder;
      },
      withDisableExecuteApiEndpoint: value => {
        pushParam(params, DISABLE_EXECUTE_API_ENDPOINT_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsCloudFrontBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildAwsCloudFrontType())
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

    const satisfiedBuilder: SatisfiedAwsCloudFrontBuilder = {
      withAwsRegion: value => {
        pushParam(params, AWS_REGION_PARAM, value);
        return satisfiedBuilder;
      },
      withApiKeySource: value => {
        pushParam(params, API_KEY_SOURCE_PARAM, value);
        return satisfiedBuilder;
      },
      withBinaryMediaTypes: value => {
        pushParam(params, BINARY_MEDIA_TYPES_PARAM, value);
        return satisfiedBuilder;
      },
      withMinimumCompressionSize: value => {
        pushParam(params, MINIMUM_COMPRESSION_SIZE_PARAM, value);
        return satisfiedBuilder;
      },
      withDisableExecuteApiEndpoint: value => {
        pushParam(params, DISABLE_EXECUTE_API_ENDPOINT_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsCloudFrontConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);

    if (config.description) b.withDescription(config.description);
    if (config.awsRegion) b.withAwsRegion(config.awsRegion);
    if (config.apiKeySource) b.withApiKeySource(config.apiKeySource);
    if (config.binaryMediaTypes)
      b.withBinaryMediaTypes(config.binaryMediaTypes);
    if (config.minimumCompressionSize !== undefined)
      b.withMinimumCompressionSize(config.minimumCompressionSize);
    if (config.disableExecuteApiEndpoint !== undefined)
      b.withDisableExecuteApiEndpoint(config.disableExecuteApiEndpoint);

    return b.build();
  };
}
