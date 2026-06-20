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
import {
  SOURCE_ARTIFACT_PARAM,
  PACKAGE_TYPE_PARAM,
  RUNTIME_PARAM,
  HANDLER_PARAM,
  MEMORY_MB_PARAM,
  TIMEOUT_SECONDS_PARAM,
  ENVIRONMENT_PARAM,
} from '../../../../fractal/component/custom_workloads/faas/function';

// Agent constant: Offer type = "APIManagement.FaaS.AwsLambda"
const AWS_LAMBDA_TYPE_NAME = 'AwsLambda';

const FUNCTION_NAME_PARAM = 'functionName';
const ROLE_ARN_PARAM = 'roleArn';

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
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.FaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AWS_LAMBDA_TYPE_NAME).build(),
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
 * dependencies, links) and the unified function params are locked to the
 * blueprint and cannot be overridden.
 */
export type SatisfiedAwsLambdaBuilder = {
  withFunctionName: (functionName: string) => SatisfiedAwsLambdaBuilder;
  withRoleArn: (roleArn: string) => SatisfiedAwsLambdaBuilder;
  withRuntime: (runtime: string) => SatisfiedAwsLambdaBuilder;
  withHandler: (handler: string) => SatisfiedAwsLambdaBuilder;
  withMemoryMb: (memoryMb: number) => SatisfiedAwsLambdaBuilder;
  withTimeoutSeconds: (timeoutSeconds: number) => SatisfiedAwsLambdaBuilder;
  withEnvironment: (
    environment: Record<string, string>,
  ) => SatisfiedAwsLambdaBuilder;
  withPackageType: (packageType: string) => SatisfiedAwsLambdaBuilder;
  build: () => LiveSystemComponent;
};

export type AwsLambdaBuilder = {
  withId: (id: string) => AwsLambdaBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AwsLambdaBuilder;
  withDisplayName: (displayName: string) => AwsLambdaBuilder;
  withDescription: (description: string) => AwsLambdaBuilder;
  withSourceArtifact: (sourceArtifact: string) => AwsLambdaBuilder;
  withFunctionName: (functionName: string) => AwsLambdaBuilder;
  withRoleArn: (roleArn: string) => AwsLambdaBuilder;
  withRuntime: (runtime: string) => AwsLambdaBuilder;
  withHandler: (handler: string) => AwsLambdaBuilder;
  withMemoryMb: (memoryMb: number) => AwsLambdaBuilder;
  withTimeoutSeconds: (timeoutSeconds: number) => AwsLambdaBuilder;
  withEnvironment: (environment: Record<string, string>) => AwsLambdaBuilder;
  withPackageType: (packageType: string) => AwsLambdaBuilder;
  build: () => LiveSystemComponent;
};

export type AwsLambdaConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  sourceArtifact: string;
  functionName?: string;
  roleArn?: string;
  runtime?: string;
  handler?: string;
  memoryMb?: number;
  timeoutSeconds?: number;
  environment?: Record<string, string>;
  packageType?: string;
};

export namespace AwsLambda {
  export const getBuilder = (): AwsLambdaBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('AWS');

    const builder: AwsLambdaBuilder = {
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
      withSourceArtifact: value => {
        pushParam(params, SOURCE_ARTIFACT_PARAM, value);
        return builder;
      },
      withFunctionName: value => {
        pushParam(params, FUNCTION_NAME_PARAM, value);
        return builder;
      },
      withRoleArn: value => {
        pushParam(params, ROLE_ARN_PARAM, value);
        return builder;
      },
      withRuntime: value => {
        pushParam(params, RUNTIME_PARAM, value);
        return builder;
      },
      withHandler: value => {
        pushParam(params, HANDLER_PARAM, value);
        return builder;
      },
      withMemoryMb: value => {
        pushParam(params, MEMORY_MB_PARAM, value);
        return builder;
      },
      withTimeoutSeconds: value => {
        pushParam(params, TIMEOUT_SECONDS_PARAM, value);
        return builder;
      },
      withEnvironment: value => {
        pushParam(params, ENVIRONMENT_PARAM, value);
        return builder;
      },
      withPackageType: value => {
        pushParam(params, PACKAGE_TYPE_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Function component as an AWS Lambda.
   * Carries id, version, displayName, dependencies, links, and the unified
   * function params (sourceArtifact, packageType, runtime, handler, memoryMb,
   * timeoutSeconds, environment). Vendor-specific params (functionName, roleArn)
   * are added via the sealed builder.
   */
  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAwsLambdaBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
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

    // Carry the unified function params straight through.
    const paramKeys = [
      SOURCE_ARTIFACT_PARAM,
      PACKAGE_TYPE_PARAM,
      RUNTIME_PARAM,
      HANDLER_PARAM,
      MEMORY_MB_PARAM,
      TIMEOUT_SECONDS_PARAM,
      ENVIRONMENT_PARAM,
    ];
    for (const key of paramKeys) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) params.push(key, val as Record<string, object>);
    }

    const satisfiedBuilder: SatisfiedAwsLambdaBuilder = {
      withFunctionName: value => {
        pushParam(params, FUNCTION_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      withRoleArn: value => {
        pushParam(params, ROLE_ARN_PARAM, value);
        return satisfiedBuilder;
      },
      withRuntime: value => {
        pushParam(params, RUNTIME_PARAM, value);
        return satisfiedBuilder;
      },
      withHandler: value => {
        pushParam(params, HANDLER_PARAM, value);
        return satisfiedBuilder;
      },
      withMemoryMb: value => {
        pushParam(params, MEMORY_MB_PARAM, value);
        return satisfiedBuilder;
      },
      withTimeoutSeconds: value => {
        pushParam(params, TIMEOUT_SECONDS_PARAM, value);
        return satisfiedBuilder;
      },
      withEnvironment: value => {
        pushParam(params, ENVIRONMENT_PARAM, value);
        return satisfiedBuilder;
      },
      withPackageType: value => {
        pushParam(params, PACKAGE_TYPE_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: AwsLambdaConfig): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withSourceArtifact(config.sourceArtifact);

    if (config.description) b.withDescription(config.description);
    if (config.functionName) b.withFunctionName(config.functionName);
    if (config.roleArn) b.withRoleArn(config.roleArn);
    if (config.runtime) b.withRuntime(config.runtime);
    if (config.handler) b.withHandler(config.handler);
    if (config.memoryMb !== undefined) b.withMemoryMb(config.memoryMb);
    if (config.timeoutSeconds !== undefined) {
      b.withTimeoutSeconds(config.timeoutSeconds);
    }
    if (config.environment) b.withEnvironment(config.environment);
    if (config.packageType) b.withPackageType(config.packageType);

    return b.build();
  };
}
