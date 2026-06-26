import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {
  createAbstractComponent,
  AbstractComponent,
} from '../../abstract_component';
import {Offer} from '../../../offer';
import {BlueprintComponentDependency} from '../../dependency';
import {ComponentLink} from '../../../../component/link';

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

// ── Neutral Interface keys (Fractal + Interface migration) ────────────────────
// A knob is a neutral Interface op iff >=2 candidate offers share it. The four
// keys below are shared by the Function offers (AWS Lambda, Azure Function,
// GCP Google Function) and are set through the Fractal Interface via
// `component.set(key, value)`. Everything else (functionName, roleArn, handler,
// memoryMb, timeoutSeconds on AWS; storageAccountConnectionString, appSettings,
// configuration, identity, appServicePlan on Azure; location, entryPoint on GCP)
// is an offer-only extra and stays off the neutral Interface.
export const SOURCE_ARTIFACT_NEUTRAL_PARAM = SOURCE_ARTIFACT_PARAM;
export const PACKAGE_TYPE_NEUTRAL_PARAM = PACKAGE_TYPE_PARAM;
export const RUNTIME_NEUTRAL_PARAM = RUNTIME_PARAM;
export const ENVIRONMENT_NEUTRAL_PARAM = ENVIRONMENT_PARAM;

// ── Fractal + Interface abstract component ────────────────────────────────────

/** Package format hint for the function artefact. */
export type FunctionPackageType = 'image' | 'zip';

/**
 * Config for the vendor-neutral `Function` abstract component. The dev declares
 * the candidate Offers (one per provider) plus any blueprint dependencies/links;
 * the Provider chosen at LiveSystem time selects the matching Offer.
 */
export type FunctionConfig = {
  id: string;
  displayName: string;
  description?: string;
  /** Candidate offers that can satisfy this function (one per provider). */
  offers: Offer[];
  dependencies?: BlueprintComponentDependency[];
  links?: ComponentLink[];
};

export namespace Function {
  /** Vendor-neutral Service name this capability resolves to. */
  export const SERVICE_NAME = FUNCTION_TYPE_NAME;

  /**
   * Build the abstract `Function` capability ("I need to run a serverless
   * function"). Satisfied by candidate Offers (AWS Lambda on AWS, Azure Function
   * on Azure, Google Function on GCP). The dev specializes it through the
   * Fractal Interface using vendor-neutral keys only — `sourceArtifact`,
   * `packageType`, `runtime`, `environment` (set via `component.set(key, value)`);
   * everything else (function name, role ARN, handler, app service plan, ...) is
   * an offer-only extra and stays off the Interface.
   */
  export const create = (config: FunctionConfig): AbstractComponent =>
    createAbstractComponent({
      id: config.id,
      displayName: config.displayName,
      description: config.description,
      domain: InfrastructureDomain.CustomWorkloads,
      serviceName: SERVICE_NAME,
      offers: config.offers,
      dependencies: config.dependencies,
      links: config.links,
    });
}
