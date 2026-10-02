/** environment/environment_plan.ts — what deploying one or more environment
 *  trees would do, environment by environment, without writing anything. */
import type {EnvironmentPlanEntry} from './environment_plan_entry';

export type EnvironmentPlan = {
  /** Each environment once, management environments before their operational ones. */
  entries: EnvironmentPlanEntry[];
  /** True when a deploy would refuse a tree (an entry is `refused`). */
  refused: boolean;
};
