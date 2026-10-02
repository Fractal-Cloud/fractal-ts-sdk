/**
 * Deploy the environment tree (runs on `main` only). AWS credentials come from
 * one `aws-actions/configure-aws-credentials` step per account, exported as
 * <PREFIX>_AWS_ACCESS_KEY_ID / _SECRET_ACCESS_KEY / _SESSION_TOKEN.
 */
import {
  createFractalCloudClient,
  type ProviderCredentials,
} from '@fractal_cloud/sdk';
import {management} from './environments';

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
};

// All three values are required: the control plane uses AWS credentials as
// inline credentials only when the session token is present too.
const awsFor = (prefix: string): ProviderCredentials => ({
  aws: {
    accessKeyId: required(`${prefix}_AWS_ACCESS_KEY_ID`),
    secretAccessKey: required(`${prefix}_AWS_SECRET_ACCESS_KEY`),
    sessionToken: required(`${prefix}_AWS_SESSION_TOKEN`),
  },
});

const prefixByEnvironment: Record<string, string> = {
  mgmt: 'MGMT',
  prod: 'PROD',
  dev: 'DEV',
};

const cloud = createFractalCloudClient({
  clientId: required('SERVICE_ACCOUNT_ID'),
  clientSecret: required('SERVICE_ACCOUNT_SECRET'),
});

await cloud.environments.deploy(management, {
  // Asked once per environment, right before its agent is initialized.
  providerCredentials: ({environment}) => {
    const prefix = prefixByEnvironment[environment.shortName];
    if (prefix === undefined) {
      throw new Error(
        `No AWS credentials mapped for '${environment.shortName}'`,
      );
    }
    return awsFor(prefix);
  },
  // Operational initializations are refused until the management one has
  // Completed; `wait` runs them in that order within one deploy.
  agentInit: 'wait',
});
