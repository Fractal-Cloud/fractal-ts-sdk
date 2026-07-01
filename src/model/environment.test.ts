/**
 * environment.test.ts — Environment builders, refs, resolution + validation.
 *
 * Pure (no HTTP): proves the fluent immutable builders, the deployable refs for
 * both tiers, operational-agent identity inheritance from the management env,
 * and the aggregated validation rules.
 */
import {describe, it, expect} from 'vitest';
import {
  ManagementEnvironment,
  OperationalEnvironment,
  resolveEnvironment,
  type CloudAgent,
} from './environment/index';

const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const rg = (name: string) => `Personal/${OWNER}/${name}`;

const baseMgmt = () =>
  ManagementEnvironment({
    id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [rg('mgmt-rg')],
  }).withAzureCloudAgent({
    region: 'westeurope',
    tenantId: 'tenant-1',
    subscriptionId: 'sub-mgmt',
  });

describe('environment builders', () => {
  it('is immutable — withX returns a new node, original unchanged', () => {
    const a = OperationalEnvironment({shortName: 'prod'});
    const b = a.withResourceGroup(rg('prod-rg'));
    expect(a.state.resourceGroups).toEqual([]);
    expect(b.state.resourceGroups).toEqual([rg('prod-rg')]);
    expect(a).not.toBe(b);
  });

  it('re-adding a cloud agent for the same provider replaces it', () => {
    const m = baseMgmt().withAzureCloudAgent({
      region: 'eastus',
      tenantId: 'tenant-2',
      subscriptionId: 'sub-2',
    });
    const azure = m.state.cloudAgents.filter(a => a.provider === 'AZURE');
    expect(azure).toHaveLength(1);
    expect((azure[0] as Extract<CloudAgent, {provider: 'AZURE'}>).region).toBe(
      'eastus',
    );
  });
});

describe('deployable refs', () => {
  it('management ref() maps id → OwnerRef', () => {
    expect(baseMgmt().ref()).toEqual({
      ownerType: 'Personal',
      ownerId: OWNER,
      name: 'mgmt',
    });
  });

  it('operational ref via management inherits type + ownerId', () => {
    const prod = OperationalEnvironment({
      shortName: 'prod',
    }).withAzureSubscription({
      region: 'westeurope',
      subscriptionId: 'sub-prod',
    });
    const mgmt = baseMgmt().withOperationalEnvironments([prod]);
    expect(mgmt.operational('prod').ref()).toEqual({
      ownerType: 'Personal',
      ownerId: OWNER,
      name: 'prod',
    });
  });

  it('standalone operational ref() throws (no management context)', () => {
    expect(() => OperationalEnvironment({shortName: 'prod'}).ref()).toThrow(
      /no management context/,
    );
  });

  it('operational(unknown) throws listing known names', () => {
    const mgmt = baseMgmt().withOperationalEnvironment(
      OperationalEnvironment({shortName: 'prod'}),
    );
    expect(() => mgmt.operational('staging')).toThrow(/prod/);
  });
});

describe('resolveEnvironment', () => {
  it('derives operational id + inherits agent identity from management', () => {
    const prod = OperationalEnvironment({
      shortName: 'prod',
      resourceGroups: [rg('prod-rg')],
    }).withAzureSubscription({
      region: 'northeurope',
      subscriptionId: 'sub-prod',
    });
    const mgmt = baseMgmt().withOperationalEnvironments([prod]);

    const tree = resolveEnvironment(mgmt);
    expect(tree.operationals).toHaveLength(1);
    const op = tree.operationals[0];
    expect(op.id).toEqual({
      type: 'Personal',
      ownerId: OWNER,
      shortName: 'prod',
    });

    const agent = op.cloudAgents[0] as Extract<CloudAgent, {provider: 'AZURE'}>;
    expect(agent).toEqual({
      provider: 'AZURE',
      region: 'northeurope', // from the operational account
      tenantId: 'tenant-1', // inherited from the management agent
      subscriptionId: 'sub-prod', // from the operational account
    });
  });

  it('builds the agents / tags parameters on the management env', () => {
    const mgmt = baseMgmt()
      .withAwsCloudAgent({
        region: 'eu-west-1',
        organizationId: 'o-abc',
        accountId: '123456789012',
      })
      .withTag('team', 'platform');
    const tree = resolveEnvironment(mgmt);
    const agents = tree.management.parameters.agents as {provider: string}[];
    expect(agents.map(a => a.provider).sort()).toEqual(['AWS', 'AZURE']);
    expect(tree.management.parameters.tags).toEqual({team: 'platform'});
  });

  it('errors when an operational account has no matching management agent', () => {
    const prod = OperationalEnvironment({
      shortName: 'prod',
      resourceGroups: [rg('prod-rg')],
    }).withAwsAccount({region: 'eu-west-1', accountId: '123456789012'});
    const mgmt = baseMgmt().withOperationalEnvironments([prod]); // only Azure agent
    expect(() => resolveEnvironment(mgmt)).toThrow(/no AWS cloud agent/);
  });

  it('aggregates validation errors (resource groups, short name, secrets)', () => {
    const bad = ManagementEnvironment({
      id: {type: 'Personal', ownerId: OWNER, shortName: 'Bad_Name'},
    }) // no resource groups, invalid short name
      .withSecret({shortName: 'x', displayName: 'X', value: ''}); // blank value
    expect(() => resolveEnvironment(bad)).toThrow(
      /Environment validation failed/,
    );
  });

  it('errors when CI/CD profiles exist without a default', () => {
    const mgmt = baseMgmt().withCiCdProfile({
      shortName: 'extra',
      displayName: 'Extra',
      sshPrivateKeyData: 'key',
    });
    expect(() => resolveEnvironment(mgmt)).toThrow(/default CI\/CD profile/);
  });
});
