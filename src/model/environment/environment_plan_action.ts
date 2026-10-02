/** environment/environment_plan_action.ts — what a deploy would do with one
 *  environment: `create` (+), `update` (~), `unchanged` (=), or `refused` (!)
 *  when the deploy would refuse the tree because of it. */
export type EnvironmentPlanAction =
  'create' | 'update' | 'unchanged' | 'refused';
