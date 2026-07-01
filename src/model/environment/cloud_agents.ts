/**
 * environment/cloud_agents.ts — cloud-agent configuration per provider.
 *
 * A cloud agent is declared on the MANAGEMENT environment with full identity
 * (org/tenant/tenancy + account/subscription/project/compartment). An OPERATIONAL
 * environment declares only a cloud ACCOUNT per provider (the account/subscription
 * /project/compartment); the org/tenant/tenancy is inherited from the matching
 * management agent when the tree is resolved. Mirrors the Java SDK CloudAgentEntity
 * hierarchy + OperationalEnvironment.cloudProviders wiring.
 */
import type {ProviderType} from './types';

/** A fully-identified cloud agent declared on a management environment. */
export type CloudAgent =
  | {provider: 'AWS'; region: string; organizationId: string; accountId: string}
  | {
      provider: 'AZURE';
      region: string;
      tenantId: string;
      subscriptionId: string;
    }
  | {provider: 'GCP'; region: string; organizationId: string; projectId: string}
  | {
      provider: 'OCI';
      region: string;
      tenancyId: string;
      compartmentId: string;
    }
  | {provider: 'HETZNER'; region: string; projectId: string};

/** A cloud account declared on an operational environment (identity minus the
 *  org/tenant/tenancy, which is inherited from the management agent). */
export type CloudAccount =
  | {provider: 'AWS'; region: string; accountId: string}
  | {provider: 'AZURE'; region: string; subscriptionId: string}
  | {provider: 'GCP'; region: string; projectId: string}
  | {provider: 'OCI'; region: string; compartmentId: string}
  | {provider: 'HETZNER'; region: string; projectId: string};

/**
 * Resolve an operational cloud account into a full agent by inheriting the
 * org/tenant/tenancy identity from the matching management agent. Throws when
 * the operational account references a provider with no management agent.
 */
export const resolveOperationalAgent = (
  account: CloudAccount,
  managementAgent: CloudAgent | undefined,
): CloudAgent => {
  if (managementAgent === undefined) {
    throw new Error(
      `Operational environment declares a ${account.provider} cloud account but ` +
        `the management environment has no ${account.provider} cloud agent to inherit identity from.`,
    );
  }
  switch (account.provider) {
    case 'AWS':
      if (managementAgent.provider !== 'AWS') {
        break;
      }
      return {
        provider: 'AWS',
        region: account.region,
        organizationId: managementAgent.organizationId,
        accountId: account.accountId,
      };
    case 'AZURE':
      if (managementAgent.provider !== 'AZURE') {
        break;
      }
      return {
        provider: 'AZURE',
        region: account.region,
        tenantId: managementAgent.tenantId,
        subscriptionId: account.subscriptionId,
      };
    case 'GCP':
      if (managementAgent.provider !== 'GCP') {
        break;
      }
      return {
        provider: 'GCP',
        region: account.region,
        organizationId: managementAgent.organizationId,
        projectId: account.projectId,
      };
    case 'OCI':
      if (managementAgent.provider !== 'OCI') {
        break;
      }
      return {
        provider: 'OCI',
        region: account.region,
        tenancyId: managementAgent.tenancyId,
        compartmentId: account.compartmentId,
      };
    case 'HETZNER':
      return {
        provider: 'HETZNER',
        region: account.region,
        projectId: account.projectId,
      };
  }
  // Unreachable in practice: managementAgent map is keyed by provider.
  throw new Error(
    `Provider mismatch resolving operational ${account.provider} cloud account.`,
  );
};

/** Serialize a cloud agent into the map the API stores under the env `agents`
 *  parameter. `provider` + `region` + provider-specific identity keys. */
export const agentParams = (agent: CloudAgent): Record<string, unknown> => {
  switch (agent.provider) {
    case 'AWS':
      return {
        provider: agent.provider,
        region: agent.region,
        organizationId: agent.organizationId,
        accountId: agent.accountId,
      };
    case 'AZURE':
      return {
        provider: agent.provider,
        region: agent.region,
        tenantId: agent.tenantId,
        subscriptionId: agent.subscriptionId,
      };
    case 'GCP':
      return {
        provider: agent.provider,
        region: agent.region,
        organizationId: agent.organizationId,
        projectId: agent.projectId,
      };
    case 'OCI':
      return {
        provider: agent.provider,
        region: agent.region,
        tenancyId: agent.tenancyId,
        compartmentId: agent.compartmentId,
      };
    case 'HETZNER':
      return {
        provider: agent.provider,
        region: agent.region,
        projectId: agent.projectId,
      };
  }
};

/** Provider of a cloud account (for keying by provider). */
export const accountProvider = (a: CloudAccount): ProviderType => a.provider;
