/**
 * environment/environment.ts — immutable, fluent Environment builders.
 *
 * Matches the component-catalogue idiom (`Factory(cfg).withXxx(...)` returning a
 * new immutable node). A ManagementEnvironment owns cloud AGENTS (full identity)
 * and OperationalEnvironments; an OperationalEnvironment declares a cloud ACCOUNT
 * per provider and is a target a LiveSystem lands in.
 *
 * Both tiers expose a deployable reference:
 *   - `mgmt.ref()`                     → deploy a LiveSystem on the MANAGEMENT env
 *   - `mgmt.operational('prod').ref()` → deploy a LiveSystem on an OPERATIONAL env
 * A standalone operational node cannot produce a ref (its id inherits the parent's
 * type + ownerId); resolve it through its management env first.
 *
 * `resolveEnvironment(mgmt)` validates the tree and produces the plain data the
 * service layer submits (operational ids derived, operational agents inherited).
 */
import type {OwnerRef} from '../core';
import type {
  CiCdProfile,
  DnsZone,
  EnvironmentId,
  ResourceGroupId,
  Secret,
} from './types';
import {
  formatEnvironmentId,
  validateCiCdProfile,
  validateEnvironmentShortName,
  validateSecret,
} from './types';
import {
  agentParams,
  resolveOperationalAgent,
  type CloudAccount,
  type CloudAgent,
} from './cloud_agents';

const envRef = (id: EnvironmentId): OwnerRef => ({
  ownerType: id.type,
  ownerId: id.ownerId,
  name: id.shortName,
});

// ── shared environment fields ─────────────────────────────────────────────────
type CommonState = {
  name?: string;
  resourceGroups: readonly ResourceGroupId[];
  tags: Readonly<Record<string, string>>;
  dnsZones: readonly DnsZone[];
  secrets: readonly Secret[];
  defaultCiCdProfile?: CiCdProfile;
  ciCdProfiles: readonly CiCdProfile[];
};

const emptyCommon = (): CommonState => ({
  resourceGroups: [],
  tags: {},
  dnsZones: [],
  secrets: [],
  ciCdProfiles: [],
});

// ── Operational environment ────────────────────────────────────────────────────
type OperationalState = CommonState & {
  shortName: string;
  cloudAccounts: readonly CloudAccount[];
  /** Set only once resolved through a management env (enables `.ref()`). */
  managementId?: EnvironmentId;
};

export type OperationalEnvironmentNode = {
  readonly state: OperationalState;
  withName(name: string): OperationalEnvironmentNode;
  withResourceGroups(
    rgs: readonly ResourceGroupId[],
  ): OperationalEnvironmentNode;
  withResourceGroup(rg: ResourceGroupId): OperationalEnvironmentNode;
  withTags(tags: Record<string, string>): OperationalEnvironmentNode;
  withTag(key: string, value: string): OperationalEnvironmentNode;
  withDnsZones(zones: readonly DnsZone[]): OperationalEnvironmentNode;
  withSecrets(secrets: readonly Secret[]): OperationalEnvironmentNode;
  withSecret(secret: Secret): OperationalEnvironmentNode;
  withDefaultCiCdProfile(profile: CiCdProfile): OperationalEnvironmentNode;
  withCiCdProfiles(
    profiles: readonly CiCdProfile[],
  ): OperationalEnvironmentNode;
  withCiCdProfile(profile: CiCdProfile): OperationalEnvironmentNode;
  withAwsAccount(cfg: {
    region: string;
    accountId: string;
  }): OperationalEnvironmentNode;
  withAzureSubscription(cfg: {
    region: string;
    subscriptionId: string;
  }): OperationalEnvironmentNode;
  withGcpProject(cfg: {
    region: string;
    projectId: string;
  }): OperationalEnvironmentNode;
  withOciCompartment(cfg: {
    region: string;
    compartmentId: string;
  }): OperationalEnvironmentNode;
  withHetznerProject(cfg: {
    region: string;
    projectId: string;
  }): OperationalEnvironmentNode;
  /** Deployable ref — only after resolution through a management env. */
  ref(): OwnerRef;
};

const operationalNode = (s: OperationalState): OperationalEnvironmentNode => {
  const next = (patch: Partial<OperationalState>): OperationalEnvironmentNode =>
    operationalNode({...s, ...patch});
  const addAccount = (account: CloudAccount): OperationalEnvironmentNode =>
    next({
      cloudAccounts: [
        ...s.cloudAccounts.filter(a => a.provider !== account.provider),
        account,
      ],
    });
  return {
    state: s,
    withName: name => next({name}),
    withResourceGroups: rgs =>
      next({resourceGroups: [...s.resourceGroups, ...rgs]}),
    withResourceGroup: rg => next({resourceGroups: [...s.resourceGroups, rg]}),
    withTags: tags => next({tags: {...s.tags, ...tags}}),
    withTag: (key, value) => next({tags: {...s.tags, [key]: value}}),
    withDnsZones: zones => next({dnsZones: [...s.dnsZones, ...zones]}),
    withSecrets: secrets => next({secrets: [...s.secrets, ...secrets]}),
    withSecret: secret => next({secrets: [...s.secrets, secret]}),
    withDefaultCiCdProfile: profile => next({defaultCiCdProfile: profile}),
    withCiCdProfiles: profiles =>
      next({ciCdProfiles: [...s.ciCdProfiles, ...profiles]}),
    withCiCdProfile: profile =>
      next({ciCdProfiles: [...s.ciCdProfiles, profile]}),
    withAwsAccount: cfg => addAccount({provider: 'AWS', ...cfg}),
    withAzureSubscription: cfg => addAccount({provider: 'AZURE', ...cfg}),
    withGcpProject: cfg => addAccount({provider: 'GCP', ...cfg}),
    withOciCompartment: cfg => addAccount({provider: 'OCI', ...cfg}),
    withHetznerProject: cfg => addAccount({provider: 'HETZNER', ...cfg}),
    ref: () => {
      if (s.managementId === undefined) {
        throw new Error(
          `Operational environment '${s.shortName}' has no management context yet. ` +
            "Use `management.operational('" +
            s.shortName +
            "').ref()` to get a deployable reference.",
        );
      }
      return envRef({
        type: s.managementId.type,
        ownerId: s.managementId.ownerId,
        shortName: s.shortName,
      });
    },
  };
};

export const OperationalEnvironment = (cfg: {
  shortName: string;
  name?: string;
  resourceGroups?: readonly ResourceGroupId[];
}): OperationalEnvironmentNode =>
  operationalNode({
    ...emptyCommon(),
    shortName: cfg.shortName,
    name: cfg.name,
    resourceGroups: cfg.resourceGroups ?? [],
    cloudAccounts: [],
  });

// ── Management environment ──────────────────────────────────────────────────────
type ManagementState = CommonState & {
  id: EnvironmentId;
  cloudAgents: readonly CloudAgent[];
  operationalEnvironments: readonly OperationalEnvironmentNode[];
};

export type ManagementEnvironmentNode = {
  readonly state: ManagementState;
  withName(name: string): ManagementEnvironmentNode;
  withResourceGroups(
    rgs: readonly ResourceGroupId[],
  ): ManagementEnvironmentNode;
  withResourceGroup(rg: ResourceGroupId): ManagementEnvironmentNode;
  withTags(tags: Record<string, string>): ManagementEnvironmentNode;
  withTag(key: string, value: string): ManagementEnvironmentNode;
  withDnsZones(zones: readonly DnsZone[]): ManagementEnvironmentNode;
  withSecrets(secrets: readonly Secret[]): ManagementEnvironmentNode;
  withSecret(secret: Secret): ManagementEnvironmentNode;
  withDefaultCiCdProfile(profile: CiCdProfile): ManagementEnvironmentNode;
  withCiCdProfiles(profiles: readonly CiCdProfile[]): ManagementEnvironmentNode;
  withCiCdProfile(profile: CiCdProfile): ManagementEnvironmentNode;
  withAwsCloudAgent(cfg: {
    region: string;
    organizationId: string;
    accountId: string;
  }): ManagementEnvironmentNode;
  withAzureCloudAgent(cfg: {
    region: string;
    tenantId: string;
    subscriptionId: string;
  }): ManagementEnvironmentNode;
  withGcpCloudAgent(cfg: {
    region: string;
    organizationId: string;
    projectId: string;
  }): ManagementEnvironmentNode;
  withOciCloudAgent(cfg: {
    region: string;
    tenancyId: string;
    compartmentId: string;
  }): ManagementEnvironmentNode;
  withHetznerCloudAgent(cfg: {
    region: string;
    projectId: string;
  }): ManagementEnvironmentNode;
  withOperationalEnvironments(
    envs: readonly OperationalEnvironmentNode[],
  ): ManagementEnvironmentNode;
  withOperationalEnvironment(
    env: OperationalEnvironmentNode,
  ): ManagementEnvironmentNode;
  /** Deployable ref to the MANAGEMENT env itself. */
  ref(): OwnerRef;
  /** Look up an operational env by short name; its `.ref()` is deployable. */
  operational(shortName: string): OperationalEnvironmentNode;
};

const managementNode = (s: ManagementState): ManagementEnvironmentNode => {
  const next = (patch: Partial<ManagementState>): ManagementEnvironmentNode =>
    managementNode({...s, ...patch});
  const addAgent = (agent: CloudAgent): ManagementEnvironmentNode =>
    next({
      cloudAgents: [
        ...s.cloudAgents.filter(a => a.provider !== agent.provider),
        agent,
      ],
    });
  return {
    state: s,
    withName: name => next({name}),
    withResourceGroups: rgs =>
      next({resourceGroups: [...s.resourceGroups, ...rgs]}),
    withResourceGroup: rg => next({resourceGroups: [...s.resourceGroups, rg]}),
    withTags: tags => next({tags: {...s.tags, ...tags}}),
    withTag: (key, value) => next({tags: {...s.tags, [key]: value}}),
    withDnsZones: zones => next({dnsZones: [...s.dnsZones, ...zones]}),
    withSecrets: secrets => next({secrets: [...s.secrets, ...secrets]}),
    withSecret: secret => next({secrets: [...s.secrets, secret]}),
    withDefaultCiCdProfile: profile => next({defaultCiCdProfile: profile}),
    withCiCdProfiles: profiles =>
      next({ciCdProfiles: [...s.ciCdProfiles, ...profiles]}),
    withCiCdProfile: profile =>
      next({ciCdProfiles: [...s.ciCdProfiles, profile]}),
    withAwsCloudAgent: cfg => addAgent({provider: 'AWS', ...cfg}),
    withAzureCloudAgent: cfg => addAgent({provider: 'AZURE', ...cfg}),
    withGcpCloudAgent: cfg => addAgent({provider: 'GCP', ...cfg}),
    withOciCloudAgent: cfg => addAgent({provider: 'OCI', ...cfg}),
    withHetznerCloudAgent: cfg => addAgent({provider: 'HETZNER', ...cfg}),
    withOperationalEnvironments: envs =>
      next({operationalEnvironments: [...s.operationalEnvironments, ...envs]}),
    withOperationalEnvironment: env =>
      next({operationalEnvironments: [...s.operationalEnvironments, env]}),
    ref: () => envRef(s.id),
    operational: shortName => {
      const found = s.operationalEnvironments.find(
        e => e.state.shortName === shortName,
      );
      if (found === undefined) {
        const known = s.operationalEnvironments
          .map(e => e.state.shortName)
          .join(', ');
        throw new Error(
          `No operational environment '${shortName}' on management environment '${s.id.shortName}'. ` +
            `Known operational environments: [${known}].`,
        );
      }
      // Bind the parent id so the returned node's `.ref()` resolves.
      return operationalNode({...found.state, managementId: s.id});
    },
  };
};

export const ManagementEnvironment = (cfg: {
  id: EnvironmentId;
  name?: string;
  resourceGroups?: readonly ResourceGroupId[];
}): ManagementEnvironmentNode =>
  managementNode({
    ...emptyCommon(),
    id: cfg.id,
    name: cfg.name,
    resourceGroups: cfg.resourceGroups ?? [],
    cloudAgents: [],
    operationalEnvironments: [],
  });

// ── resolution (validate + produce plain submit data) ────────────────────────────
/** Plain, resolved form of a single environment for the service layer. */
export type ResolvedEnvironment = {
  id: EnvironmentId;
  managementId: EnvironmentId;
  name: string;
  resourceGroups: string[];
  parameters: Record<string, unknown>;
  secrets: Secret[];
  defaultCiCdProfile?: CiCdProfile;
  ciCdProfiles: CiCdProfile[];
  cloudAgents: CloudAgent[];
};

/** A management env plus its operational envs, all resolved and validated. */
export type ResolvedEnvironmentTree = {
  management: ResolvedEnvironment;
  operationals: ResolvedEnvironment[];
};

const buildParameters = (
  common: CommonState,
  agents: readonly CloudAgent[],
): Record<string, unknown> => {
  const parameters: Record<string, unknown> = {};
  if (agents.length > 0) {
    parameters.agents = agents.map(agentParams);
  }
  if (Object.keys(common.tags).length > 0) {
    parameters.tags = {...common.tags};
  }
  if (common.dnsZones.length > 0) {
    parameters.dnsZones = common.dnsZones.map(z => ({...z}));
  }
  return parameters;
};

const validateCommon = (label: string, c: CommonState): string[] => {
  const errors: string[] = [];
  if (c.resourceGroups.length === 0) {
    errors.push(`${label}: at least one resourceGroup is required.`);
  }
  const secretNames = new Set<string>();
  for (const secret of c.secrets) {
    for (const e of validateSecret(secret)) {
      errors.push(`${label}: ${e}`);
    }
    if (secretNames.has(secret.shortName)) {
      errors.push(
        `${label}: duplicate secret shortName '${secret.shortName}'.`,
      );
    }
    secretNames.add(secret.shortName);
  }
  const profiles = [
    ...(c.defaultCiCdProfile ? [c.defaultCiCdProfile] : []),
    ...c.ciCdProfiles,
  ];
  if (c.ciCdProfiles.length > 0 && c.defaultCiCdProfile === undefined) {
    errors.push(
      `${label}: a default CI/CD profile is required when additional profiles are defined.`,
    );
  }
  const profileNames = new Set<string>();
  for (const profile of profiles) {
    for (const e of validateCiCdProfile(profile)) {
      errors.push(`${label}: ${e}`);
    }
    if (profileNames.has(profile.shortName)) {
      errors.push(
        `${label}: duplicate CI/CD profile shortName '${profile.shortName}'.`,
      );
    }
    profileNames.add(profile.shortName);
  }
  return errors;
};

const resolveCommon = (
  common: CommonState,
): Pick<
  ResolvedEnvironment,
  'name' | 'resourceGroups' | 'secrets' | 'defaultCiCdProfile' | 'ciCdProfiles'
> => ({
  name: common.name ?? '',
  resourceGroups: [...common.resourceGroups],
  secrets: [...common.secrets],
  defaultCiCdProfile: common.defaultCiCdProfile,
  ciCdProfiles: [...common.ciCdProfiles],
});

/**
 * Validate a management environment tree and produce the plain data the service
 * submits. Operational ids are derived from the management id (type + ownerId +
 * own shortName); operational cloud agents inherit org/tenant/tenancy from the
 * matching management agent. Throws with every validation error at once.
 */
export const resolveEnvironment = (
  mgmt: ManagementEnvironmentNode,
): ResolvedEnvironmentTree => {
  const s = mgmt.state;
  const errors: string[] = [];

  // management id validation
  for (const e of validateEnvironmentShortName(s.id.shortName)) {
    errors.push(`Management environment: ${e}`);
  }
  if (s.id.ownerId === undefined || s.id.ownerId.trim().length === 0) {
    errors.push('Management environment: ownerId is required.');
  }
  errors.push(...validateCommon('Management environment', s));

  const agentByProvider = new Map<string, CloudAgent>();
  for (const agent of s.cloudAgents) {
    agentByProvider.set(agent.provider, agent);
  }

  const managementName = s.name ?? s.id.shortName;
  const management: ResolvedEnvironment = {
    id: s.id,
    managementId: s.id,
    ...resolveCommon(s),
    name: managementName,
    parameters: buildParameters(s, s.cloudAgents),
    cloudAgents: [...s.cloudAgents],
  };

  const operationals: ResolvedEnvironment[] = [];
  for (const opNode of s.operationalEnvironments) {
    const os = opNode.state;
    const label = `Operational environment '${os.shortName}'`;
    for (const e of validateEnvironmentShortName(os.shortName)) {
      errors.push(`${label}: ${e}`);
    }
    errors.push(...validateCommon(label, os));

    const opAgents: CloudAgent[] = [];
    for (const account of os.cloudAccounts) {
      try {
        opAgents.push(
          resolveOperationalAgent(
            account,
            agentByProvider.get(account.provider),
          ),
        );
      } catch (err) {
        errors.push(`${label}: ${(err as Error).message}`);
      }
    }

    const opId: EnvironmentId = {
      type: s.id.type,
      ownerId: s.id.ownerId,
      shortName: os.shortName,
    };
    operationals.push({
      id: opId,
      managementId: s.id,
      ...resolveCommon(os),
      name: os.name ?? os.shortName,
      parameters: buildParameters(os, opAgents),
      cloudAgents: opAgents,
    });
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n  - ${errors.join('\n  - ')}`,
    );
  }

  return {management, operationals};
};

/** Convenience: the API id string for a resolved environment. */
export const resolvedEnvironmentId = (env: ResolvedEnvironment): string =>
  formatEnvironmentId(env.id);
