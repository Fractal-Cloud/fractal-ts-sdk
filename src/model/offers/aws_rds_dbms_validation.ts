/**
 * The checks both RDS DBMS offers share, mirroring the AWS agent's
 * `AwsRdsDbmsConfig` (fractal-cloud-agents aws.core storage/paas): an unknown
 * storage type, a master user name longer than the engine allows, a
 * `requireSecureTransport` that is not true or false, and a log-export
 * declaration that is not a list (or comma-separated text) of names. Internal:
 * not re-exported from the model barrel.
 */
import type {LiveSystemComponent} from '../core';

const AWS_RDS_STORAGE_TYPES = ['gp2', 'gp3', 'io1', 'io2', 'standard'];

const isBlank = (value: unknown): boolean =>
  value === undefined || (typeof value === 'string' && value.trim() === '');

export const validateAwsRdsDbms = (
  offer: string,
  self: LiveSystemComponent,
  maxAdministratorLoginLength: number,
): void => {
  const p = self.parameters;
  const fail = (why: string): never => {
    throw new Error(`${offer} '${self.id}': ${why}.`);
  };
  const storageType = p.storageType;
  if (
    !isBlank(storageType) &&
    !(
      typeof storageType === 'string' &&
      AWS_RDS_STORAGE_TYPES.includes(storageType.trim().toLowerCase())
    )
  ) {
    fail(
      `storageType '${String(storageType)}' is not one of ${AWS_RDS_STORAGE_TYPES.join(', ')}`,
    );
  }
  const login = p.administratorLogin;
  if (typeof login === 'string' && login.length > maxAdministratorLoginLength) {
    fail(
      `administratorLogin '${login}' is longer than ${maxAdministratorLoginLength} characters, the engine's limit`,
    );
  }
  // The agent takes true or false, in any case, and refuses anything else:
  // reading "yes" or 1 as false would turn the secure default off.
  const secure = p.requireSecureTransport;
  if (
    !isBlank(secure) &&
    typeof secure !== 'boolean' &&
    !(
      typeof secure === 'string' &&
      ['true', 'false'].includes(secure.trim().toLowerCase())
    )
  ) {
    fail(
      `requireSecureTransport must be true or false, not ${JSON.stringify(secure)}`,
    );
  }
  // A list, or comma-separated text, of names; the agent trims, lower-cases
  // and de-duplicates them, and checks them against the engine and mode.
  const exports = p.cloudwatchLogExports;
  if (
    exports !== undefined &&
    typeof exports !== 'string' &&
    !(Array.isArray(exports) && exports.every(t => typeof t === 'string'))
  ) {
    fail('cloudwatchLogExports must be a list of log type names');
  }
};
