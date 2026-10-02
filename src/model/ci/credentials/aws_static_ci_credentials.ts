/**
 * ci/credentials/aws_static_ci_credentials.ts — AWS through access keys kept as
 * CI secrets (the standard way). Long-lived keys without a session token are
 * turned into a session with `sts:GetSessionToken`, because the control plane
 * only honors three-part session credentials.
 */
import type {CiValue} from './ci_value';

export type AwsStaticCiCredentials = {
  /** The account the keys belong to; requests for any other are refused. */
  accountId: string;
  accessKeyId: CiValue;
  secretAccessKey: CiValue;
  sessionToken?: CiValue;
  /** Length of the session made from long-lived keys. Default 3600. */
  sessionDurationSeconds?: number;
};
