/**
 * ci/credentials/ci_credentials_config.ts — which cloud accounts a CI job may
 * initialize, and how it gets credentials for each.
 *
 * One job holds ONE cloud's credentials (`cloud`): it mints or reads only that
 * cloud's, and every other cloud's agents are skipped with a notice and left to
 * their own job. So the configuration of every cloud can be shared by all jobs,
 * and no job ever holds another cloud's credentials. Each cloud is OIDC
 * (recommended) or static on its own.
 */
import type {AwsCiCredentials} from './aws_ci_credentials';
import type {AzureCiCredentials} from './azure_ci_credentials';
import type {CiCloud} from './ci_cloud';
import type {GcpCiCredentials} from './gcp_ci_credentials';

export type CiCredentialsConfig = {
  /** The cloud this job holds credentials for (checked at runtime, so a CI
   *  variable such as `ci.variable('FRACTAL_CLOUD')` can be passed as is). */
  cloud: CiCloud | (string & {}) | undefined;
  /** One entry per AWS account. */
  aws?: AwsCiCredentials | readonly AwsCiCredentials[];
  gcp?: GcpCiCredentials | readonly GcpCiCredentials[];
  azure?: AzureCiCredentials | readonly AzureCiCredentials[];
  /** When set, the short names of the only environments credentials are handed out for. */
  environments?: readonly string[];
};
