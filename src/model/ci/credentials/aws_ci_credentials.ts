/** ci/credentials/aws_ci_credentials.ts — one AWS account's credentials. */
import type {AwsOidcCiCredentials} from './aws_oidc_ci_credentials';
import type {AwsStaticCiCredentials} from './aws_static_ci_credentials';

export type AwsCiCredentials = AwsOidcCiCredentials | AwsStaticCiCredentials;
