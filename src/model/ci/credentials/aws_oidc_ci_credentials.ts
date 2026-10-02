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
   * Session length when the SDK exchanges the token (`exchange: 'sdk'`).
   * Default 3600, the most a role allows unless its MaxSessionDuration was
   * raised. The control plane sets its own when it exchanges.
   */
  sessionDurationSeconds?: number;
  /**
   * Who exchanges the token for a session. `control-plane` (default): the
   * token is handed over (`X-AWS-Role-Arn` / `X-AWS-Web-Identity-Token`) and the
   * control plane calls `sts:AssumeRoleWithWebIdentity` itself, at request time,
   * for the run's window; needs fractal-environments v3.32.0 or later. `sdk`:
   * this process calls it and hands over the resulting three-part session,
   * which works with older control planes too.
   */
  exchange?: 'sdk' | 'control-plane';
};
