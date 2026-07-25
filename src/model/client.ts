/**
 * client.ts — the Fractal Cloud API client.
 *
 * Credentials and the API base URL are held ONCE, here, instead of being threaded
 * through every operation. Operations are grouped by the entity they act on, and
 * a Blueprint and a LiveSystem are different entities:
 *
 *   cloud.blueprints.create(fractal)   — register the reusable, ABSTRACT blueprint
 *   cloud.liveSystems.deploy(ls)       — deploy a vendor-resolved instantiation
 *
 * These are segregated on purpose. A blueprint references Level-1 Component
 * contracts (`Storage.ObjectStorage`) so it stays satisfiable by any vendor's
 * Offer; only a LiveSystem carries resolved Offer types (`Storage.PaaS.AwsS3`)
 * plus `provider`/`deliveryModel`. Deploying a LiveSystem never publishes a
 * blueprint as a side effect — callers that want both compose the two calls.
 */
import superagent from 'superagent';
import type {LiveSystem, PublishableFractal, SerializedComponent} from './core';
import {
  apiUrl,
  authHeaders,
  bcString,
  pathSegment,
  versionString,
} from './http';
import type {ApiConfig} from './http';
import {
  deployLiveSystem,
  destroyLiveSystem,
  liveSystemOutputs,
} from './service';
import type {DeployOptions, LiveSystemState} from './service';
import {deployEnvironment} from './environment/service';
import type {DeployEnvironmentOptions} from './environment/service';
import type {ManagementEnvironmentNode} from './environment/environment';

export type FractalCloudClientConfig = ApiConfig;

// ── blueprint body ───────────────────────────────────────────────────────────
// A blueprint component is an abstract CONTRACT: the Level-1 Component tag plus
// the architect's guardrail parameters, dependencies and links. It carries no
// vendor identity — no `provider`, no `deliveryModel`, no Offer type.
const DELIVERY_MODEL_SEGMENTS = ['IaaS', 'PaaS', 'CaaS', 'SaaS', 'FaaS'];

/** Reject an Offer type reaching the blueprint. An Offer type is 3-part and its
 *  middle segment names a service delivery model, so it is vendor-locked and can
 *  never be re-satisfied by another vendor. */
const assertAbstractComponent = (c: SerializedComponent): void => {
  if (c.component.split('.').some(s => DELIVERY_MODEL_SEGMENTS.includes(s))) {
    throw new Error(
      `Blueprint component '${c.id}' has type '${c.component}', which names a ` +
        'service delivery model and is therefore an Offer type. A blueprint must ' +
        'reference abstract Component contracts only (e.g. Storage.ObjectStorage) ' +
        'so it remains satisfiable by any vendor.',
    );
  }
};

/** Options for {@link FractalCloudClient.blueprints}`.create`. */
export type CreateBlueprintOptions = {
  /** Register the Fractal as private, so it is not offered in the shared
   *  catalogue. Defaults to `false` (publicly listed). */
  isPrivate?: boolean;
};

const blueprintBody = (
  f: PublishableFractal,
  opts: CreateBlueprintOptions,
) => ({
  description:
    f.description ||
    `${f.fractalName} — authored via the Fractal Cloud TypeScript SDK`,
  isPrivate: opts.isPrivate ?? false,
  components: f.blueprint.components.map(c => {
    assertAbstractComponent(c);
    return {
      type: c.component,
      id: c.id,
      displayName: c.displayName,
      parameters: c.parameters,
      dependencies: [...c.dependencies],
      links: c.links.map(l => ({
        componentId: l.componentId,
        settings: l.settings,
      })),
    };
  }),
});

const blueprintUrl = (
  cfg: FractalCloudClientConfig,
  f: PublishableFractal,
): string =>
  apiUrl(
    cfg,
    `/blueprints/${bcString(f.boundedContext)}/${pathSegment(f.fractalName)}/${versionString(f.version)}`,
  );

/** Upsert the blueprint: create it, or update it in place when that version
 *  already exists. Idempotent so re-running a deployment script is safe. */
const createBlueprint = async (
  cfg: FractalCloudClientConfig,
  f: PublishableFractal,
  opts: CreateBlueprintOptions,
): Promise<void> => {
  // Validate before touching the network: a corrupt blueprint must not reach the
  // control plane even as a probe.
  const body = blueprintBody(f, opts);
  const url = blueprintUrl(cfg, f);
  const existing = await superagent
    .get(url)
    .ok(res => res.status === 200 || res.status === 404)
    .set(authHeaders(cfg));
  if (existing.status === 200) {
    await superagent.put(url).set(authHeaders(cfg)).send(body);
  } else {
    await superagent.post(url).set(authHeaders(cfg)).send(body);
  }
};

// ── client ───────────────────────────────────────────────────────────────────
export type FractalCloudClient = {
  blueprints: {
    /**
     * Register a Fractal's blueprint — its abstract Component contracts.
     *
     * Accepts a base Fractal only. A specialized fractal does not satisfy
     * {@link PublishableFractal}: specialization is application-level intent, and
     * publishing it would bake one application's components and parameters into an
     * artifact meant to be reused by others.
     */
    create: (
      fractal: PublishableFractal,
      opts?: CreateBlueprintOptions,
    ) => Promise<void>;
  };
  liveSystems: {
    /**
     * Deploy (create or update) a LiveSystem. The blueprint it instantiates must
     * already be registered — the API rejects the deployment otherwise. Compose
     * `blueprints.create` before this when you own both.
     */
    deploy: (
      ls: LiveSystem,
      opts?: DeployOptions,
    ) => Promise<LiveSystemState | undefined>;
    /** Read a deployed LiveSystem's per-component output fields. */
    outputs: (target: LiveSystem | string) => Promise<LiveSystemState>;
    /** Destroy a deployed LiveSystem. Its blueprint stays registered. */
    destroy: (ls: LiveSystem) => Promise<void>;
  };
  environments: {
    /**
     * Deploy a management environment tree: the management env and each
     * operational env, their secrets and CI/CD profiles, then cloud-agent
     * initialization.
     */
    deploy: (
      management: ManagementEnvironmentNode,
      opts?: DeployEnvironmentOptions,
    ) => Promise<void>;
  };
};

/** Build a client bound to one set of credentials (and optionally one API host). */
export const createFractalCloudClient = (
  cfg: FractalCloudClientConfig,
): FractalCloudClient => ({
  blueprints: {
    create: (fractal, opts = {}) => createBlueprint(cfg, fractal, opts),
  },
  liveSystems: {
    deploy: (ls, opts) => deployLiveSystem(ls, cfg, opts),
    outputs: target => liveSystemOutputs(target, cfg),
    destroy: ls => destroyLiveSystem(ls, cfg),
  },
  environments: {
    deploy: (management, opts) => deployEnvironment(management, cfg, opts),
  },
});
