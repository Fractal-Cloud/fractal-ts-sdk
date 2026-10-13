/**
 * environment_dns_zone_component_access.test.ts — the ceiling an environment
 * DNS zone sets on what its components may be granted (`componentAccess`).
 * Sent as declared; a ceiling the control plane could not read without
 * guessing is refused before anything is sent.
 */
import {describe, expect, it} from 'vitest';
import {
  ManagementEnvironment,
  OperationalEnvironment,
  resolveEnvironment,
  type DnsZone,
} from './environment/index';

const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const RG = `Organizational/${OWNER}/rg`;

const tree = (zone: DnsZone, operational?: DnsZone) =>
  resolveEnvironment(
    ManagementEnvironment({
      id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
      resourceGroups: [RG],
    })
      .withGcpCloudAgent({
        region: 'europe-west1',
        organizationId: 'o',
        projectId: 'p',
      })
      .withDnsZones([zone])
      .withOperationalEnvironment(
        OperationalEnvironment({shortName: 'prod'})
          .withResourceGroup(RG)
          .withDnsZones(operational === undefined ? [] : [operational]),
      ),
  );

const zonesOf = (parameters: Record<string, unknown>) =>
  parameters.dnsZones as Record<string, unknown>[];

describe('componentAccess on an environment DNS zone', () => {
  it('is sent as declared, on the management and an operational environment', () => {
    const {management, operationals} = tree(
      {
        name: 'example.com',
        recordManagement: 'lax',
        componentAccess: {'*': 'read', TXT: 'write', CNAME: 'write'},
      },
      {name: 'apps.example.org', componentAccess: {'*': 'read'}},
    );
    expect(zonesOf(management.parameters)[0]).toEqual({
      name: 'example.com',
      recordManagement: 'lax',
      componentAccess: {'*': 'read', TXT: 'write', CNAME: 'write'},
    });
    expect(zonesOf(operationals[0].parameters)[0].componentAccess).toEqual({
      '*': 'read',
    });
  });

  it('is not sent when absent: no component is granted anything', () => {
    const {management} = tree({name: 'example.com'});
    expect('componentAccess' in zonesOf(management.parameters)[0]).toBe(false);
  });

  it('accepts write excluding some types', () => {
    expect(() =>
      tree({
        name: 'example.com',
        recordManagement: 'lax',
        componentAccess: {'*': 'write', MX: 'none'},
      }),
    ).not.toThrow();
  });

  it.each([
    [
      {TXT: 'read'},
      "Management environment: DNS zone 'example.com': componentAccess sets 'read' on TXT",
    ],
    [
      {SOA: 'write'},
      "Management environment: DNS zone 'example.com': componentAccess 'SOA' is not a record type access can be granted on",
    ],
    [
      {'*': 'admin'},
      `Management environment: DNS zone 'example.com': componentAccess "admin" is not an access level`,
    ],
    [
      ['TXT'],
      "Management environment: DNS zone 'example.com': componentAccess [\"TXT\"] is not a map",
    ],
  ])('refuses the ceiling %j', (ceiling, reason) => {
    expect(() =>
      tree({name: 'example.com', componentAccess: ceiling as never}),
    ).toThrow(reason);
  });

  it('names the operational environment whose ceiling is refused', () => {
    expect(() =>
      tree(
        {name: 'example.com'},
        {name: 'apps.example.org', componentAccess: {txt: 'Read'} as never},
      ),
    ).toThrow(
      "Operational environment 'prod': DNS zone 'apps.example.org': componentAccess sets 'read' on TXT",
    );
  });
});
