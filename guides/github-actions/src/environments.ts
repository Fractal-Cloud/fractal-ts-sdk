/**
 * The environment tree — one management account, two operational accounts.
 * Imported by deploy.ts (main) and plan.ts (pull requests).
 */
import {
  ManagementEnvironment,
  OperationalEnvironment,
  type ManagementEnvironmentNode,
} from '@fractal_cloud/sdk';

export const OWNER_ID = process.env.FRACTAL_OWNER_ID!; // Organizational owner id (GUID)
const rg = (name: string) => `Organizational/${OWNER_ID}/${name}`;

export const management: ManagementEnvironmentNode = ManagementEnvironment({
  id: {type: 'Organizational', ownerId: OWNER_ID, shortName: 'mgmt'},
  name: 'Management',
  resourceGroups: [rg('platform')],
})
  .withAwsCloudAgent({
    region: 'eu-central-1',
    organizationId: 'o-abc123def4',
    accountId: '111111111111',
  })
  .withOperationalEnvironment(
    OperationalEnvironment({shortName: 'prod', resourceGroups: [rg('prod')]})
      .withAwsAccount({region: 'eu-central-1', accountId: '222222222222'})
      .withNetworkTier('prod'),
  )
  .withOperationalEnvironment(
    OperationalEnvironment({shortName: 'dev', resourceGroups: [rg('dev')]})
      .withAwsAccount({region: 'eu-central-1', accountId: '333333333333'})
      .withNetworkTier('nonprod'),
  );
