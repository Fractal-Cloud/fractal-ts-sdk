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
  mergeEnvironmentParameters,
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

describe('environment parameters', () => {
  it('withNetworkTier declares networkTier, immutably', () => {
    const a = baseMgmt();
    const b = a.withNetworkTier('prod');
    expect(a.state.parameters).toEqual({});
    expect(b.state.parameters).toEqual({networkTier: 'prod'});
    expect(resolveEnvironment(b).management.parameters).toMatchObject({
      networkTier: 'prod',
      agents: [expect.objectContaining({provider: 'AZURE'})],
    });
  });

  it('withParameter declares free-form keys on both tiers', () => {
    const tree = resolveEnvironment(
      baseMgmt()
        .withParameter('costCenter', 'cc-1')
        .withOperationalEnvironment(
          OperationalEnvironment({
            shortName: 'prod',
            resourceGroups: [rg('prod-rg')],
          })
            .withParameter('owner', {team: 'platform'})
            .withNetworkTier('prod'),
        ),
    );
    expect(tree.management.parameters.costCenter).toBe('cc-1');
    expect(tree.operationals[0].parameters).toEqual({
      owner: {team: 'platform'},
      networkTier: 'prod',
    });
  });

  it.each(['agents', 'tags', 'dnsZones'])(
    'withParameter refuses the builder-owned key %s',
    key => {
      expect(() => baseMgmt().withParameter(key, {})).toThrow(
        /managed by the builder/,
      );
    },
  );

  it.each(['agents', 'tags', 'dnsZones'])(
    'withParameter accepts null for the builder-owned key %s, to clear it',
    key => {
      const tree = resolveEnvironment(baseMgmt().withParameter(key, null));
      if (key === 'agents') {
        // A typed declaration wins over the clear.
        expect(tree.management.parameters.agents).toHaveLength(1);
      } else {
        expect(tree.management.parameters[key]).toBeNull();
      }
    },
  );

  it('withParameter refuses a blank key', () => {
    expect(() => baseMgmt().withParameter('  ', 1)).toThrow(/blank/);
  });

  it('rejects a networkTier the control plane would fail on', () => {
    expect(() =>
      resolveEnvironment(baseMgmt().withParameter('networkTier', 'staging')),
    ).toThrow(/networkTier must be one of \[prod, nonprod\], got "staging"/);
  });

  it('refuses an operational tier the management tier would override', () => {
    const tree = baseMgmt()
      .withNetworkTier('nonprod')
      .withOperationalEnvironment(
        OperationalEnvironment({
          shortName: 'prod',
          resourceGroups: [rg('prod-rg')],
        }).withNetworkTier('prod'),
      );
    expect(() => resolveEnvironment(tree)).toThrow(
      /'prod': networkTier 'prod' would be ignored .* declares networkTier 'nonprod'/,
    );
  });

  it('accepts an operational tier equal to the management tier', () => {
    const tree = baseMgmt()
      .withNetworkTier('prod')
      .withOperationalEnvironment(
        OperationalEnvironment({
          shortName: 'prod',
          resourceGroups: [rg('prod-rg')],
        }).withNetworkTier('prod'),
      );
    expect(() => resolveEnvironment(tree)).not.toThrow();
  });

  it('operational(name) keeps declared parameters', () => {
    const m = baseMgmt().withOperationalEnvironment(
      OperationalEnvironment({shortName: 'dev'}).withNetworkTier('nonprod'),
    );
    expect(m.operational('dev').state.parameters).toEqual({
      networkTier: 'nonprod',
    });
  });
});

describe('mergeEnvironmentParameters', () => {
  it('keeps undeclared keys, overlays declared ones, drops declared nulls', () => {
    expect(
      mergeEnvironmentParameters(
        {a: 1, NetworkTier: 'nonprod', gone: true, nested: {x: 1}},
        {networkTier: 'prod', gone: null, b: 2},
      ),
    ).toEqual({a: 1, nested: {x: 1}, networkTier: 'prod', b: 2});
  });

  it('tolerates a server with no parameters', () => {
    expect(mergeEnvironmentParameters(null, {k: 'v', z: null})).toEqual({
      k: 'v',
    });
  });
});

describe('environment parameters — key case', () => {
  it('a differently-cased key replaces the earlier spelling', () => {
    const m = baseMgmt()
      .withParameter('NetworkTier', 'nonprod')
      .withNetworkTier('prod');
    expect(m.state.parameters).toEqual({networkTier: 'prod'});
  });

  it('validates networkTier under any spelling', () => {
    expect(() =>
      resolveEnvironment(baseMgmt().withParameter('NETWORKTIER', 'staging')),
    ).toThrow(/networkTier must be one of/);
  });

  it('refuses a reserved key under any spelling', () => {
    expect(() => baseMgmt().withParameter('Agents', [])).toThrow(
      /managed by the builder/,
    );
    expect(() => baseMgmt().withParameter('TAGS', null)).toThrow(
      /managed by the builder/,
    );
  });

  it('detects a tier conflict under any spelling', () => {
    const tree = baseMgmt()
      .withParameter('NetworkTier', 'nonprod')
      .withOperationalEnvironment(
        OperationalEnvironment({
          shortName: 'prod',
          resourceGroups: [rg('prod-rg')],
        }).withNetworkTier('prod'),
      );
    expect(() => resolveEnvironment(tree)).toThrow(/would be ignored/);
  });
});
