/**
 * ci/credentials/aws_static_ci_credentials.ts — AWS through access keys kept as
 * CI secrets (the standard way). Long-lived keys are sent as they are (the
 * control plane holds them for the run only and checks their account with
 * `sts:GetCallerIdentity`); an assumed-role session sends its token too. Both
 * need fractal-environments v3.32.0 or later for keys without a session token.
 */
import type {CiValue} from './ci_value';

export type AwsStaticCiCredentials = {
  /** The account the keys belong to; requests for any other are refused. */
  accountId: string;
  accessKeyId: CiValue;
  secretAccessKey: CiValue;
  sessionToken?: CiValue;
  /**
   * @deprecated Ignored. Long-lived keys are no longer exchanged for a session:
   * a `sts:GetSessionToken` session cannot call IAM without MFA.
   */
  sessionDurationSeconds?: number;
};
