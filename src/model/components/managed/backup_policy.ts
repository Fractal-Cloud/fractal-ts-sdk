/**
 * The scheduled backups of a managed service's data. Set with
 * `.withBackupPolicy(...)`, a guardrail. Where the backups go is the
 * environment's (each Live System has its own backup location); this says only
 * when they are taken and how long they are kept.
 */
export type BackupPolicy = {
  /** When a backup is taken, as a cron expression (e.g. `0 1 * * *`). */
  schedule: string;
  /** How many days a backup is kept. */
  retentionDays: number;
};
