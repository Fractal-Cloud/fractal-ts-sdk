import type {LiveSystemComponent} from '../core';
import type {AwsRdsDbmsConfig} from './aws_rds_dbms_config';
import type {AwsRdsStorageType} from './aws_rds_storage_type';

const AWS_RDS_STORAGE_TYPES: readonly AwsRdsStorageType[] = [
  'gp2',
  'gp3',
  'io1',
  'io2',
  'standard',
];

/**
 * The checks both RDS DBMS offers share, refusing what the agent would refuse later: an unknown
 * storage type, a malformed log-export list, and (where the engine caps it) a master user name
 * that is too long.
 */
export const validateAwsRdsDbms = (
  offer: string,
  self: LiveSystemComponent,
  config: AwsRdsDbmsConfig,
  maxAdministratorLoginLength?: number,
): void => {
  if (
    config.storageType !== undefined &&
    !AWS_RDS_STORAGE_TYPES.includes(config.storageType)
  ) {
    throw new Error(
      `${offer} '${self.id}': storageType '${config.storageType}' is not ` +
        `one of ${AWS_RDS_STORAGE_TYPES.join(', ')}.`,
    );
  }
  if (
    maxAdministratorLoginLength !== undefined &&
    config.administratorLogin !== undefined &&
    config.administratorLogin.length > maxAdministratorLoginLength
  ) {
    throw new Error(
      `${offer} '${self.id}': administratorLogin '${config.administratorLogin}' is ` +
        `longer than ${maxAdministratorLoginLength} characters, the engine's limit.`,
    );
  }
  const exports: unknown = config.cloudwatchLogExports;
  if (exports === undefined) {
    return;
  }
  if (
    !Array.isArray(exports) ||
    !exports.every(t => typeof t === 'string' && t.trim() !== '')
  ) {
    throw new Error(
      `${offer} '${self.id}': cloudwatchLogExports must be a list of log type names.`,
    );
  }
  const repeated = exports.filter((t, i) => exports.indexOf(t) !== i);
  if (repeated.length > 0) {
    throw new Error(
      `${offer} '${self.id}': cloudwatchLogExports lists ${[...new Set(repeated)].join(', ')} more than once.`,
    );
  }
};
