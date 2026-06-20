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
  ENVIRONMENT_PARAM,
} from '../../../../fractal/component/custom_workloads/faas/function';

// Agent constant: Offer type = "CustomWorkloads.FaaS.AzureFunction"
const AZURE_FUNCTION_TYPE_NAME = 'AzureFunction';

const STORAGE_ACCOUNT_CONNECTION_STRING_PARAM =
  'storageAccountConnectionString';
const APP_SETTINGS_PARAM = 'appSettings';
const CONFIGURATION_PARAM = 'configuration';
const APP_SERVICE_PLAN_PARAM = 'appServicePlan';

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
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.FaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(AZURE_FUNCTION_TYPE_NAME).build(),
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

// ── Public API: configuration / plan shapes ──────────────────────────────────

/**
 * Runtime stack for the Function App. Exactly one version field is expected;
 * the agent maps it to the matching App Service `applicationStack` setting.
 */
export type AzureFunctionApplicationStack = {
  nodeVersion?: string;
  pythonVersion?: string;
  dotnetVersion?: string;
  javaVersion?: string;
  powerShellVersion?: string;
};

export type AzureFunctionCorsSettings = {
  allowedOrigins: string[];
  supportCredentials?: boolean;
};

/**
 * Pragmatic passthrough of the App Service `configuration` block. Mirrors the
 * shape the cloud agent reads; only `applicationStack` has a strongly-typed
 * helper (`withApplicationStack`) — the rest are optional passthrough fields.
 */
export type AzureFunctionConfiguration = {
  applicationStack?: AzureFunctionApplicationStack;
  alwaysOn?: boolean;
  http2Enabled?: boolean;
  minimumTlsVersion?: string;
  ftpsState?: string;
  healthCheckPath?: string;
  corsSettings?: AzureFunctionCorsSettings;
};

export type AzureFunctionIdentity = {
  type: string;
};

/**
 * Pragmatic passthrough of the App Service plan block, mirroring the shape the
 * cloud agent reads when a function runs on a dedicated/elastic plan.
 */
export type AzureFunctionAppServicePlan = {
  name?: string;
  sku?: string;
  tier?: string;
  capacity?: number;
};

/**
 * Returned by satisfy() — only exposes vendor-specific parameters.
 * Structural properties and the unified function params (sourceArtifact,
 * packageType, environment) are locked to the blueprint.
 */
export type SatisfiedAzureFunctionBuilder = {
  withStorageAccountConnectionString: (
    connectionString: string,
  ) => SatisfiedAzureFunctionBuilder;
  withAppSettings: (
    appSettings: Record<string, string>,
  ) => SatisfiedAzureFunctionBuilder;
  withApplicationStack: (
    applicationStack: AzureFunctionApplicationStack,
  ) => SatisfiedAzureFunctionBuilder;
  withConfiguration: (
    configuration: AzureFunctionConfiguration,
  ) => SatisfiedAzureFunctionBuilder;
  withIdentity: (
    identity: AzureFunctionIdentity,
  ) => SatisfiedAzureFunctionBuilder;
  withAppServicePlan: (
    appServicePlan: AzureFunctionAppServicePlan,
  ) => SatisfiedAzureFunctionBuilder;
  withPackageType: (packageType: string) => SatisfiedAzureFunctionBuilder;
  build: () => LiveSystemComponent;
};

export type AzureFunctionBuilder = {
  withId: (id: string) => AzureFunctionBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => AzureFunctionBuilder;
  withDisplayName: (displayName: string) => AzureFunctionBuilder;
  withDescription: (description: string) => AzureFunctionBuilder;
  withSourceArtifact: (sourceArtifact: string) => AzureFunctionBuilder;
  withPackageType: (packageType: string) => AzureFunctionBuilder;
  withEnvironment: (
    environment: Record<string, string>,
  ) => AzureFunctionBuilder;
  withStorageAccountConnectionString: (
    connectionString: string,
  ) => AzureFunctionBuilder;
  withAppSettings: (
    appSettings: Record<string, string>,
  ) => AzureFunctionBuilder;
  withApplicationStack: (
    applicationStack: AzureFunctionApplicationStack,
  ) => AzureFunctionBuilder;
  withConfiguration: (
    configuration: AzureFunctionConfiguration,
  ) => AzureFunctionBuilder;
  withIdentity: (identity: AzureFunctionIdentity) => AzureFunctionBuilder;
  withAppServicePlan: (
    appServicePlan: AzureFunctionAppServicePlan,
  ) => AzureFunctionBuilder;
  build: () => LiveSystemComponent;
};

export type AzureFunctionConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  sourceArtifact: string;
  packageType?: string;
  environment?: Record<string, string>;
  storageAccountConnectionString?: string;
  appSettings?: Record<string, string>;
  applicationStack?: AzureFunctionApplicationStack;
  configuration?: AzureFunctionConfiguration;
  identity?: AzureFunctionIdentity;
  appServicePlan?: AzureFunctionAppServicePlan;
};

export namespace AzureFunction {
  export const getBuilder = (): AzureFunctionBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure');

    const builder: AzureFunctionBuilder = {
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
      withPackageType: value => {
        pushParam(params, PACKAGE_TYPE_PARAM, value);
        return builder;
      },
      withEnvironment: value => {
        pushParam(params, ENVIRONMENT_PARAM, value);
        return builder;
      },
      withStorageAccountConnectionString: value => {
        pushParam(params, STORAGE_ACCOUNT_CONNECTION_STRING_PARAM, value);
        return builder;
      },
      withAppSettings: value => {
        pushParam(params, APP_SETTINGS_PARAM, value);
        return builder;
      },
      withApplicationStack: value => {
        pushParam(params, CONFIGURATION_PARAM, {applicationStack: value});
        return builder;
      },
      withConfiguration: value => {
        pushParam(params, CONFIGURATION_PARAM, value);
        return builder;
      },
      withIdentity: value => {
        pushParam(params, 'identity', value);
        return builder;
      },
      withAppServicePlan: value => {
        pushParam(params, APP_SERVICE_PLAN_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  /**
   * Satisfies a blueprint Function component as an Azure Function.
   * Carries id, version, displayName, dependencies, links, and the unified
   * function params (sourceArtifact, packageType, environment). Vendor-specific
   * params (storageAccountConnectionString, appSettings, configuration /
   * applicationStack, identity, appServicePlan) are added via the sealed
   * builder.
   */
  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedAzureFunctionBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Azure')
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
      ENVIRONMENT_PARAM,
    ];
    for (const key of paramKeys) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) params.push(key, val as Record<string, object>);
    }

    const satisfiedBuilder: SatisfiedAzureFunctionBuilder = {
      withStorageAccountConnectionString: value => {
        pushParam(params, STORAGE_ACCOUNT_CONNECTION_STRING_PARAM, value);
        return satisfiedBuilder;
      },
      withAppSettings: value => {
        pushParam(params, APP_SETTINGS_PARAM, value);
        return satisfiedBuilder;
      },
      withApplicationStack: value => {
        pushParam(params, CONFIGURATION_PARAM, {applicationStack: value});
        return satisfiedBuilder;
      },
      withConfiguration: value => {
        pushParam(params, CONFIGURATION_PARAM, value);
        return satisfiedBuilder;
      },
      withIdentity: value => {
        pushParam(params, 'identity', value);
        return satisfiedBuilder;
      },
      withAppServicePlan: value => {
        pushParam(params, APP_SERVICE_PLAN_PARAM, value);
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

  export const create = (config: AzureFunctionConfig): LiveSystemComponent => {
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
    if (config.packageType) b.withPackageType(config.packageType);
    if (config.environment) b.withEnvironment(config.environment);
    if (config.storageAccountConnectionString) {
      b.withStorageAccountConnectionString(
        config.storageAccountConnectionString,
      );
    }
    if (config.appSettings) b.withAppSettings(config.appSettings);
    // `configuration` (full block) takes precedence; otherwise a bare
    // `applicationStack` is wrapped into a configuration object.
    if (config.configuration) {
      b.withConfiguration(config.configuration);
    } else if (config.applicationStack) {
      b.withApplicationStack(config.applicationStack);
    }
    if (config.identity) b.withIdentity(config.identity);
    if (config.appServicePlan) b.withAppServicePlan(config.appServicePlan);

    return b.build();
  };
}
