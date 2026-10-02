/**
 * ci/credentials/aws_oidc_ci_credentials.ts — AWS through the CI's OIDC
 * identity (recommended): a role that trusts the CI's issuer.
 */
export type AwsOidcCiCredentials = {
  /** The role to assume; its account is the one these credentials serve. */
  roleArn: string;
  /** Token audience. Default `sts.amazonaws.com` (or the CI's fixed one). */
  audience?: string;
  /**
   * Session length when the SDK exchanges the token. Default 3600, the most a
   * role allows unless its MaxSessionDuration was raised. The control plane may
   * keep initializing with the session for up to about an hour.
   */
  sessionDurationSeconds?: number;
  /**
   * Who exchanges the token for a session. `sdk` (default): this process calls
   * `sts:AssumeRoleWithWebIdentity` and hands the control plane the resulting
   * session. `control-plane`: the token itself is handed over, for a control
   * plane that performs the exchange.
   */
  exchange?: 'sdk' | 'control-plane';
};
