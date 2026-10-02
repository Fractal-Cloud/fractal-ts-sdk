/**
 * environment_dns_zone_providers.test.ts — which providers host a declared DNS
 * zone (`providers`), checked when the tree is resolved, before anything is sent.
 */
import {describe, it, expect} from 'vitest';
import {
  ManagementEnvironment,
  OperationalEnvironment,
  resolveEnvironment,
  type DnsZone,
} from './environment/index';

const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';

const mgmt = () =>
  ManagementEnvironment({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [`Organizational/${OWNER}/rg`],
  })
    .withAzureCloudAgent({region: 'westeurope', tenantId: 't', subscriptionId: 's'})
    .withGcpCloudAgent({region: 'europe-west1', organizationId: 'o', projectId: 'p'});

const zone = (extra: Partial<DnsZone> = {}): DnsZone => ({name: 'fractal.cloud', ...extra});

describe('DNS zone providers', () => {
  it('sends the selection as declared', () => {
    const {management} = resolveEnvironment(mgmt().withDnsZones([zone({providers: ['GCP']})]));
    expect(management.parameters.dnsZones).toEqual([{name: 'fractal.cloud', providers: ['GCP']}]);
  });

  it('defaults to every agent, which may then not all sign it', () => {
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone({dnssec: 'optional'})]))).not.toThrow();
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone({dnssec: 'required'})]))).toThrow(
      /dnssec 'required'.*several providers.*RFC 8901/s,
    );
    expect(() =>
      resolveEnvironment(mgmt().withDnsZones([zone({dnssec: 'required', providers: ['GCP']})])),
    ).not.toThrow();
  });

  it('refuses a provider the environment has no agent for', () => {
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone({providers: ['AWS']})]))).toThrow(
      /Management environment: DNS zone 'fractal.cloud' selects AWS.*no AWS agent/s,
    );
  });

  it('checks an operational environment against its own cloud accounts', () => {
    const op = OperationalEnvironment({shortName: 'prod'})
      .withResourceGroup(`Organizational/${OWNER}/rg`)
      .withGcpProject({region: 'europe-west1', projectId: 'prod-p'})
      .withDnsZones([zone({providers: ['Azure']})]);
    expect(() => resolveEnvironment(mgmt().withOperationalEnvironment(op))).toThrow(
      /Operational environment 'prod': DNS zone 'fractal.cloud' selects Azure/,
    );
  });

  it('refuses an empty or unknown selection', () => {
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone({providers: []})]))).toThrow(
      /providers is empty/,
    );
    expect(() =>
      resolveEnvironment(
        mgmt().withDnsZones([zone({providers: ['Oracle' as unknown as 'AWS']})]),
      ),
    ).toThrow(/'Oracle' is not a DNS provider/);
  });
});
