/**
 * environment/agent_order.ts — the order of an environment's `agents` is not a
 * change.
 *
 * The control plane reads agents by provider, so two declarations listing the
 * same agents in another order mean the same thing. Keeping the stored order in
 * that case means a deploy never rewrites an environment just to reorder it, and
 * the stored order never flips between runs that declare it differently.
 */
import {stableJson} from './stable_json';

const AGENTS = 'agents';

const agentsKey = (parameters: Readonly<Record<string, unknown>>) =>
  Object.keys(parameters).find(k => k.toLowerCase() === AGENTS);

/** Agents as an order-insensitive comparable string; any other value as is. */
export const comparableParameter = (key: string, value: unknown): string =>
  key.toLowerCase() === AGENTS && Array.isArray(value)
    ? stableJson(value.map(stableJson).sort())
    : stableJson(value);

/**
 * `merged` with the stored `agents` put back when they are the same agents in
 * another order. Returns `merged` itself when there is nothing to keep.
 */
export const keepStoredAgentOrder = (
  stored: Readonly<Record<string, unknown>>,
  merged: Record<string, unknown>,
): Record<string, unknown> => {
  const storedKey = agentsKey(stored);
  const mergedKey = agentsKey(merged);
  if (
    storedKey === undefined ||
    mergedKey !== storedKey ||
    stableJson(stored[storedKey]) === stableJson(merged[mergedKey]) ||
    comparableParameter(AGENTS, stored[storedKey]) !==
      comparableParameter(AGENTS, merged[mergedKey])
  ) {
    return merged;
  }
  return {...merged, [mergedKey]: stored[storedKey]};
};
