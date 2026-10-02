/**
 * environment/plan_rendering.ts — a plan as diff-style lines, and as the
 * markdown a CI step summary shows (`ci.reporter.appendSummary(...)`).
 */
import type {EnvironmentPlan} from './environment_plan';
import type {EnvironmentPlanEntry} from './environment_plan_entry';

const line = (e: EnvironmentPlanEntry): string => {
  const name = e.environment.shortName;
  switch (e.action) {
    case 'create':
      return `+ create ${name}`;
    case 'update':
      return `~ update ${name}: ${e.changes.join(', ')}`;
    case 'refused':
      return `! ${name}: ${e.message ?? 'refused'}`;
    default:
      return `= ${name} (${e.status ?? 'unknown'}, initialized: ${
        e.initializedClouds.length === 0
          ? 'none'
          : e.initializedClouds.join(',')
      })`;
  }
};

/** `+` create, `~` update, `=` unchanged, `!` refused: one line per environment. */
export const formatEnvironmentPlan = (plan: EnvironmentPlan): string =>
  plan.entries.map(line).join('\n');

/** The plan as a `## Environments plan` section with a diff block. */
export const environmentPlanMarkdown = (plan: EnvironmentPlan): string =>
  `## Environments plan\n\n\`\`\`diff\n${formatEnvironmentPlan(plan)}\n\`\`\`\n`;
