/**
 * environment/plan.ts — preview what `environments.deploy` would create, update
 * or leave alone, read-only.
 *
 * It mirrors the deploy's own decisions: create when an environment is absent
 * or Deleted; update when its name, resource groups or parameters after the
 * deploy's merge differ (the agents' order aside, which the deploy keeps too).
 * It also reports the refusal a deploy can only make once it has read the
 * management environment: an operational `networkTier` the stored management
 * tier would override.
 */
import type {ApiConfig} from '../http';
import {comparableParameter, keepStoredAgentOrder} from './agent_order';
import {
  resolveEnvironment,
  type ManagementEnvironmentNode,
} from './environment';
import type {EnvironmentPlan} from './environment_plan';
import type {EnvironmentPlanEntry} from './environment_plan_entry';
import {findParameter} from './parameters';
import {
  getEnvironment,
  listEnvironments,
  mergeEnvironmentParameters,
} from './service';
import {stableJson} from './stable_json';
import {
  formatEnvironmentId,
  NETWORK_TIER_PARAMETER,
  type EnvironmentDetails,
  type EnvironmentSummary,
} from './types';

const tierOf = (parameters: Readonly<Record<string, unknown>>): string => {
  const value = findParameter(parameters, NETWORK_TIER_PARAMETER);
  return value === undefined || value === null
    ? ''
    : String(value).trim().toLowerCase();
};

const changesOf = (
  declared: {
    name: string;
    resourceGroups: string[];
    parameters: Record<string, unknown>;
  },
  stored: EnvironmentDetails,
): string[] => {
  const out: string[] = [];
  if (stored.name !== declared.name) {
    out.push('name');
  }
  if (
    stableJson([...stored.resourceGroups].sort()) !==
    stableJson([...declared.resourceGroups].sort())
  ) {
    out.push('resourceGroups');
  }
  const next = keepStoredAgentOrder(
    stored.parameters,
    mergeEnvironmentParameters(stored.parameters, declared.parameters),
  );
  for (const k of new Set([
    ...Object.keys(stored.parameters),
    ...Object.keys(next),
  ])) {
    if (
      comparableParameter(k, stored.parameters[k]) !==
      comparableParameter(k, next[k])
    ) {
      out.push(`parameters.${k}`);
    }
  }
  return out;
};

export async function planEnvironments(
  trees: ManagementEnvironmentNode | readonly ManagementEnvironmentNode[],
  cfg: ApiConfig,
): Promise<EnvironmentPlan> {
  // Validates every tree first, throwing with every error at once.
  const resolved = (Array.isArray(trees) ? trees : [trees]).map(t =>
    resolveEnvironment(t as ManagementEnvironmentNode),
  );
  const summaries = new Map<string, EnvironmentSummary>();
  const owners = new Set<string>();
  for (const tree of resolved) {
    for (const env of [tree.management, ...tree.operationals]) {
      const owner = `${env.id.type}/${env.id.ownerId}`;
      if (owners.has(owner)) {
        continue;
      }
      owners.add(owner);
      for (const s of await listEnvironments(
        {type: env.id.type, ownerId: env.id.ownerId},
        cfg,
      )) {
        summaries.set(formatEnvironmentId(s.id), s);
      }
    }
  }

  const entries: EnvironmentPlanEntry[] = [];
  const seen = new Set<string>();
  for (const tree of resolved) {
    let managementTier = '';
    for (const env of [tree.management, ...tree.operationals]) {
      const id = formatEnvironmentId(env.id);
      const summary = summaries.get(id);
      const stored =
        summary === undefined || summary.status.toLowerCase() === 'deleted'
          ? null
          : await getEnvironment(env.id, cfg);
      const after =
        stored === null
          ? env.parameters
          : mergeEnvironmentParameters(stored.parameters, env.parameters);
      const base = {
        environment: {...env.id},
        status: stored?.status ?? null,
        initializedClouds:
          stored === null ? [] : [...(summary?.initializedClouds ?? [])],
      };
      if (env === tree.management) {
        managementTier = tierOf(after);
      } else {
        const opTier = tierOf(env.parameters);
        if (
          opTier !== '' &&
          managementTier !== '' &&
          opTier !== managementTier
        ) {
          entries.push({
            ...base,
            action: 'refused',
            changes: [],
            message:
              `networkTier '${opTier}' would be refused: the management environment ` +
              `'${formatEnvironmentId(tree.management.id)}' stores '${managementTier}'.`,
          });
          seen.add(id);
          continue;
        }
      }
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      if (stored === null) {
        entries.push({...base, action: 'create', changes: []});
        continue;
      }
      const changes = changesOf(env, stored);
      entries.push({
        ...base,
        action: changes.length === 0 ? 'unchanged' : 'update',
        changes,
      });
    }
  }
  return {entries, refused: entries.some(e => e.action === 'refused')};
}
