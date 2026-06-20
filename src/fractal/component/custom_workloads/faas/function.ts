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

export const FUNCTION_TYPE_NAME = 'Function';

// ── Unified sourceArtifact (OCI-artefact) contract ──────────────────────────
//
// A serverless function is shipped as an OCI artefact in the customer's
// registry — the same model as container images and the DataProcessingJob
// `artifactUri`. The agent resolves `sourceArtifact` (and any cloud-storage
// scheme to http first) and deploys it as an image or zip function.
export const SOURCE_ARTIFACT_PARAM = 'sourceArtifact'; // OCI ref, REQUIRED
export const PACKAGE_TYPE_PARAM = 'packageType'; // "image" | "zip" | blank=auto
export const RUNTIME_PARAM = 'runtime';
export const HANDLER_PARAM = 'handler';
export const ENTRY_POINT_PARAM = 'entryPoint';
export const MEMORY_MB_PARAM = 'memoryMb';
export const TIMEOUT_SECONDS_PARAM = 'timeoutSeconds';
export const ENVIRONMENT_PARAM = 'environment';

export const PACKAGE_TYPE_IMAGE = 'image';
export const PACKAGE_TYPE_ZIP = 'zip';

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

function buildFunctionType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.FaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(FUNCTION_TYPE_NAME).build(),
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

/** Package format hint for the function artefact. */
export type FunctionPackageType = 'image' | 'zip';

export type FunctionComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
};

export type FunctionBuilder = {
  withId: (id: string) => FunctionBuilder;
  withVersion: (major: number, minor: number, patch: number) => FunctionBuilder;
  withDisplayName: (displayName: string) => FunctionBuilder;
  withDescription: (description: string) => FunctionBuilder;
  /** OCI artefact reference for the function code (REQUIRED). */
  withSourceArtifact: (sourceArtifact: string) => FunctionBuilder;
  /** Package format hint: "image" or "zip". Blank lets the agent auto-detect. */
  withPackageType: (packageType: string) => FunctionBuilder;
  withRuntime: (runtime: string) => FunctionBuilder;
  /** Handler reference for zip artefacts (not needed for image packages). */
  withHandler: (handler: string) => FunctionBuilder;
  /** Entry point (module:function form) for runtimes that require it. */
  withEntryPoint: (entryPoint: string) => FunctionBuilder;
  withMemoryMb: (memoryMb: number) => FunctionBuilder;
  withTimeoutSeconds: (timeoutSeconds: number) => FunctionBuilder;
  /** Environment variables injected into the function runtime. */
  withEnvironment: (environment: Record<string, string>) => FunctionBuilder;
  build: () => BlueprintComponent;
};

export type FunctionConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  sourceArtifact: string;
  packageType?: FunctionPackageType;
  runtime?: string;
  handler?: string;
  entryPoint?: string;
  memoryMb?: number;
  timeoutSeconds?: number;
  environment?: Record<string, string>;
};

function makeFunctionComponent(
  component: BlueprintComponent,
): FunctionComponent {
  return {
    component,
    components: [component],
  };
}

export namespace Function {
  export const getBuilder = (): FunctionBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildFunctionType())
      .withParameters(params);

    const builder: FunctionBuilder = {
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
      withSourceArtifact: sourceArtifact => {
        pushParam(params, SOURCE_ARTIFACT_PARAM, sourceArtifact);
        return builder;
      },
      withPackageType: packageType => {
        pushParam(params, PACKAGE_TYPE_PARAM, packageType);
        return builder;
      },
      withRuntime: runtime => {
        pushParam(params, RUNTIME_PARAM, runtime);
        return builder;
      },
      withHandler: handler => {
        pushParam(params, HANDLER_PARAM, handler);
        return builder;
      },
      withEntryPoint: entryPoint => {
        pushParam(params, ENTRY_POINT_PARAM, entryPoint);
        return builder;
      },
      withMemoryMb: memoryMb => {
        pushParam(params, MEMORY_MB_PARAM, memoryMb);
        return builder;
      },
      withTimeoutSeconds: timeoutSeconds => {
        pushParam(params, TIMEOUT_SECONDS_PARAM, timeoutSeconds);
        return builder;
      },
      withEnvironment: environment => {
        pushParam(params, ENVIRONMENT_PARAM, environment);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (config: FunctionConfig): FunctionComponent => {
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
    if (config.runtime) b.withRuntime(config.runtime);
    if (config.handler) b.withHandler(config.handler);
    if (config.entryPoint) b.withEntryPoint(config.entryPoint);
    if (config.memoryMb !== undefined) b.withMemoryMb(config.memoryMb);
    if (config.timeoutSeconds !== undefined) {
      b.withTimeoutSeconds(config.timeoutSeconds);
    }
    if (config.environment) b.withEnvironment(config.environment);

    return makeFunctionComponent(b.build());
  };
}
