/**
 * When disruptive changes to a managed service (version upgrades) may run. Set
 * with `.withMaintenanceWindow(...)`, a guardrail. Outside the window a due
 * upgrade waits for the next one.
 */
export type MaintenanceWindow = {
  /** When the window opens, as a cron expression (e.g. `0 2 * * 0`: Sundays 02:00). */
  start: string;
  /** How many hours the window stays open. */
  durationHours: number;
};
