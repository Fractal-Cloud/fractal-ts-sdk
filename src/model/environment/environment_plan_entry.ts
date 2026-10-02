/** environment/environment_plan_entry.ts — one environment of a plan. */
import type {EnvironmentPlanAction} from './environment_plan_action';
import type {EnvironmentId} from './types';

export type EnvironmentPlanEntry = {
  environment: EnvironmentId;
  action: EnvironmentPlanAction;
  /** What an update would change: `name`, `resourceGroups`, `parameters.<key>`.
   *  The order of the agents is never a change. */
  changes: string[];
  /** The stored status, `null` when the environment would be created. */
  status: string | null;
  /** Clouds with a Completed initialization, as the server spells them. */
  initializedClouds: string[];
  /** Why the deploy would refuse it (`refused` only). */
  message?: string;
};
