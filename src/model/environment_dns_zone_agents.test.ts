/**
 * environment_dns_zone_agents.test.ts — which of an environment's agents host a
 * declared DNS zone (`agents`), checked when the tree is resolved, before
 * anything is sent. Selecting is optional: omitted, every agent of the
 * environment that hosts DNS zones hosts its own copy.
 */
import {describe, it, expect} from 'vitest';
import {
  ManagementEnvironment,
  OperationalEnvironment,
  agentIdOf,
  resolveEnvironment,
  type CloudAgent,
  type DnsZone,
  type DnsZoneAgent,
} from './environment/index';

const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';

const gcp: CloudAgent = {
  provider: 'GCP',
  region: 'europe-west1',
  organizationId: 'o',
  projectId: 'p',
};

const mgmt = () =>
  ManagementEnvironment({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [`Organizational/${OWNER}/rg`],
  })
    .withAzureCloudAgent({region: 'westeurope', tenantId: 't', subscriptionId: 's'})
    .withGcpCloudAgent({region: 'europe-west1', organizationId: 'o', projectId: 'p'});

const zone = (extra: Partial<DnsZone> = {}): DnsZone => ({name: 'fractal.cloud', ...extra});

describe('DNS zone agents', () => {
  it('sends no selection when none is made: every DNS-capable agent hosts the zone', () => {
    const {management} = resolveEnvironment(mgmt().withDnsZones([zone()]));
    expect(management.parameters.dnsZones).toEqual([{name: 'fractal.cloud'}]);
  });

  it('leaves DNSSEC across the default hosts to the control plane, which knows which agents host DNS zones', () => {
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone({dnssec: 'required'})]))).not.toThrow();
  });

  it('identifies a cloud agent by its type', () => {
    expect(agentIdOf(gcp)).toBe('gcp');
    expect(agentIdOf({provider: 'AZURE', region: 'westeurope', subscriptionId: 's'})).toBe('azure');
  });

  it('sends the selected agents by id, however they are referenced', () => {
    const {management} = resolveEnvironment(
      mgmt().withDnsZones([zone({agents: [gcp, ' Azure ']}), zone({name: 'aruba.cloud', agents: ['aria:Aruba', 'aria:_edge.1']})]),
    );
    expect(management.parameters.dnsZones).toEqual([
      {name: 'fractal.cloud', agents: ['gcp', 'azure']},
      {name: 'aruba.cloud', agents: ['aria:aruba', 'aria:_edge.1']},
    ]);
  });

  it('sends a copy of the selection', () => {
    const agents: DnsZoneAgent[] = ['gcp'];
    const {management} = resolveEnvironment(mgmt().withDnsZones([zone({agents})]));
    agents.push('azure');
    expect(management.parameters.dnsZones).toEqual([{name: 'fractal.cloud', agents: ['gcp']}]);
  });

  it('refuses an agent object the environment does not declare', () => {
    const aws: CloudAgent = {provider: 'AWS', region: 'eu-central-1', organizationId: 'o', accountId: '1'};
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone({agents: [aws]})]))).toThrow(
      /Management environment: DNS zone 'fractal.cloud' selects agent 'aws', which this environment does not declare/,
    );
  });

  it('checks an operational environment against its own cloud accounts', () => {
    const op = OperationalEnvironment({shortName: 'prod'})
      .withResourceGroup(`Organizational/${OWNER}/rg`)
      .withGcpProject({region: 'europe-west1', projectId: 'prod-p'})
      .withDnsZones([zone({agents: [{provider: 'AZURE', region: 'westeurope', subscriptionId: 's'}]})]);
    expect(() => resolveEnvironment(mgmt().withOperationalEnvironment(op))).toThrow(
      /Operational environment 'prod': DNS zone 'fractal.cloud' selects agent 'azure'/,
    );
    const ok = OperationalEnvironment({shortName: 'prod'})
      .withResourceGroup(`Organizational/${OWNER}/rg`)
      .withGcpProject({region: 'europe-west1', projectId: 'prod-p'})
      .withDnsZones([zone({agents: [gcp]})]);
    expect(() => resolveEnvironment(mgmt().withOperationalEnvironment(ok))).not.toThrow();
  });

  it('refuses an empty selection or one that is not an agent id', () => {
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone({agents: []})]))).toThrow(
      /agents is empty; omit it/,
    );
    for (const bad of ['', 'aws,gcp', 'aria:', ':aruba', 'gcp project']) {
      expect(() => resolveEnvironment(mgmt().withDnsZones([zone({agents: [bad]})]))).toThrow(
        /is not an agent id/,
      );
    }
  });

  it('refuses dnssec required on several selected agents', () => {
    expect(() =>
      resolveEnvironment(mgmt().withDnsZones([zone({dnssec: 'required', agents: ['gcp', 'azure']})])),
    ).toThrow(/dnssec 'required'.*several agents.*RFC 8901/s);
    expect(() =>
      resolveEnvironment(mgmt().withDnsZones([zone({dnssec: 'required', agents: ['gcp', 'GCP']})])),
    ).not.toThrow();
  });

  it('references an agent added as a value', () => {
    const env = ManagementEnvironment({
      id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
      resourceGroups: [`Organizational/${OWNER}/rg`],
    })
      .withCloudAgent(gcp)
      .withDnsZones([zone({agents: [gcp]})]);
    const {management} = resolveEnvironment(env);
    expect(management.cloudAgents).toEqual([gcp]);
    expect(management.parameters.dnsZones).toEqual([{name: 'fractal.cloud', agents: ['gcp']}]);

    const account = {provider: 'GCP' as const, region: 'europe-west1', projectId: 'prod-p'};
    const op = OperationalEnvironment({shortName: 'prod'})
      .withResourceGroup(`Organizational/${OWNER}/rg`)
      .withCloudAccount(account)
      .withDnsZones([zone({agents: [account]})]);
    expect(op.state.cloudAccounts).toEqual([account]);
    expect(() => resolveEnvironment(env.withOperationalEnvironment(op))).not.toThrow();
  });

  it('refuses per-record ownership before anything is sent, wherever the zone is declared', () => {
    const additive = {name: 'fractal.cloud', recordManagement: 'additive'} as unknown as DnsZone;
    expect(() => resolveEnvironment(mgmt().withDnsZones([additive]))).toThrow(
      /Management environment: DNS zone 'fractal\.cloud': recordManagement 'additive': per-record ownership isn't supported yet; zones are managed authoritatively/,
    );
    expect(() =>
      resolveEnvironment(
        mgmt().withOperationalEnvironment(
          OperationalEnvironment({shortName: 'prod'}).withDnsZones([additive]),
        ),
      ),
    ).toThrow(/Operational environment 'prod': DNS zone 'fractal\.cloud': recordManagement 'additive'/);
  });

  it('accepts an authoritative zone and one that does not say', () => {
    const {management} = resolveEnvironment(
      mgmt().withDnsZones([zone({recordManagement: 'authoritative'}), zone({name: 'other.cloud'})]),
    );
    expect(management.parameters.dnsZones).toEqual([
      {name: 'fractal.cloud', recordManagement: 'authoritative'},
      {name: 'other.cloud'},
    ]);
  });
});

