/**
 * Deploy one target environment: `tsx src/deploy.ts <mgmt|prod|dev>`.
 *
 * The job's single `aws-actions/configure-aws-credentials` step (output
 * credentials, exported as TARGET_AWS_*) holds the credentials of the TARGET
 * account only. The management environment is initialized by its own, earlier
 * job; when an operational job runs it is already Completed, so its credentials
 * are never requested here.
 */
import {
  createFractalCloudClient,
  type ProviderCredentials,
} from '@fractal_cloud/sdk';
import {treeFor} from './environments';

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
};

const target = process.argv[2] ?? '';
const tree = treeFor(target);

// All three values are required: the control plane uses AWS credentials as
// inline credentials only when the session token is present too.
const targetCredentials: ProviderCredentials = {
  aws: {
    accessKeyId: required('TARGET_AWS_ACCESS_KEY_ID'),
    secretAccessKey: required('TARGET_AWS_SECRET_ACCESS_KEY'),
    sessionToken: required('TARGET_AWS_SESSION_TOKEN'),
  },
};

const cloud = createFractalCloudClient({
  clientId: required('SERVICE_ACCOUNT_ID'),
  clientSecret: required('SERVICE_ACCOUNT_SECRET'),
});

await cloud.environments.deploy(tree, {
  // Asked only for an environment whose agent is about to be initialized.
  providerCredentials: ({environment}) => {
    if (environment.shortName !== target) {
      throw new Error(
        `'${environment.shortName}' needs initializing but this job holds ` +
          `credentials for '${target}' only. Run the '${environment.shortName}' job first.`,
      );
    }
    return targetCredentials;
  },
  // Operational initializations are refused until the management one has
  // Completed; `wait` makes this job end only when its initialization has.
  agentInit: 'wait',
});
