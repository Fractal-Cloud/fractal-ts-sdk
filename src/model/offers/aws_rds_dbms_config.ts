import type {AwsRdsStorageType} from './aws_rds_storage_type';

/**
 * The configuration both Amazon RDS DBMS offers take, PostgreSQL and MySQL: one vocabulary for
 * RDS, so moving an application between the engines changes the offer, never a key. Every key is
 * optional and sent only when set; the agent owns the defaults, some of which follow the engine
 * (`version` 16 / 8.4, `port` 5432 / 3306).
 */
export type AwsRdsDbmsConfig = {
  region?: string;
  mode?: 'aurora-serverless' | 'provisioned-instance';
  version?: string;
  instanceClass?: string;
  administratorLogin?: string;
  /** Provisioned mode only. */
  allocatedStorageGb?: number;
  /** Provisioned mode only — the ceiling storage autoscaling grows to. */
  maxAllocatedStorageGb?: number;
  /** Aurora Serverless v2 only. */
  minAcu?: number;
  /** Aurora Serverless v2 only. */
  maxAcu?: number;
  /**
   * Aurora mode only. Defaults from the environment's `networkTier`: 1 for
   * `prod` (so losing the writer's AZ needs no operator), 0 for `nonprod`.
   */
  readerCount?: number;
  /** Provisioned mode only. Defaults from `networkTier`: true for `prod`, false for `nonprod`. */
  multiAz?: boolean;
  backupRetentionDays?: number;
  deletionProtection?: boolean;
  /** Provisioned mode only; the agent defaults to gp3. */
  storageType?: AwsRdsStorageType;
  port?: number;
  /**
   * The database log types exported to CloudWatch Logs. Opt-in, with no default: unset leaves
   * the database's exports as they are (none on a new one), `[]` turns them off. Which types
   * exist depends on the engine and the mode (e.g. `postgresql`, `upgrade`; `error`,
   * `slowquery`, `general`, `audit`); the agent refuses one the engine does not offer.
   */
  cloudwatchLogExports?: string[];
};
