/**
 * The environment tree — one management account, two operational accounts.
 *
 * Exposed per environment so a workflow can deploy the management environment in
 * one job and each operational environment in its own job, each with freshly
 * minted credentials (see ../README.md, "Why one job per environment").
 */
import {
  ManagementEnvironment,
  OperationalEnvironment,
  type ManagementEnvironmentNode,
  type OperationalEnvironmentNode,
} from '@fractal_cloud/sdk';

const ownerId = process.env.FRACTAL_OWNER_ID;
if (ownerId === undefined || ownerId.trim().length === 0) {
  throw new Error('Missing environment variable FRACTAL_OWNER_ID');
}
export const OWNER_ID: string = ownerId;
const rg = (name: string) => `Organizational/${OWNER_ID}/${name}`;

/** The management environment on its own (no operational environments). */
export const managementOnly: ManagementEnvironmentNode = ManagementEnvironment({
  id: {type: 'Organizational', ownerId: OWNER_ID, shortName: 'mgmt'},
  name: 'Management',
  resourceGroups: [rg('platform')],
}).withAwsCloudAgent({
  region: 'eu-central-1',
  organizationId: 'o-abc123def4',
  accountId: '111111111111',
});

/** Operational environments by short name. */
export const operationals: Record<string, OperationalEnvironmentNode> = {
  prod: OperationalEnvironment({
    shortName: 'prod',
    resourceGroups: [rg('prod')],
  })
    .withAwsAccount({region: 'eu-central-1', accountId: '222222222222'})
    .withNetworkTier('prod'),
  dev: OperationalEnvironment({shortName: 'dev', resourceGroups: [rg('dev')]})
    .withAwsAccount({region: 'eu-central-1', accountId: '333333333333'})
    .withNetworkTier('nonprod'),
};

/** The whole tree. */
export const management: ManagementEnvironmentNode =
  managementOnly.withOperationalEnvironments(Object.values(operationals));

/**
 * The tree to deploy for one target: the management environment alone, or the
 * management environment plus ONE operational environment. Deploying a subset
 * never touches environments it does not declare.
 */
export const treeFor = (target: string): ManagementEnvironmentNode => {
  if (target === 'mgmt') {
    return managementOnly;
  }
  const op = operationals[target];
  if (op === undefined) {
    throw new Error(
      `Unknown environment '${target}'. Known: mgmt, ${Object.keys(operationals).join(', ')}.`,
    );
  }
  return managementOnly.withOperationalEnvironment(op);
};
