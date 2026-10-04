/**
 * dns_bulk_delete.test.ts — `allowBulkDelete`, the one-shot override of the
 * agents' DNS mass-delete guard, on the DNS Zone component and on an
 * environment's `withDnsZones` entry.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {DnsZoneComponent} from './components/dns';
import {
  ManagementEnvironment,
  resolveEnvironment,
  type DnsZone,
} from './environment/index';
import {AwsRoute53HostedZone} from './offers/dns';

const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const mgmt = () =>
  ManagementEnvironment({
    id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [`Organizational/${OWNER}/rg`],
  }).withAzureCloudAgent({
    region: 'westeurope',
    tenantId: 't',
    subscriptionId: 's',
  });

const zoneLiveSystem = (node: ReturnType<typeof DnsZoneComponent>) =>
  createFractal({
    id: 'bulk-delete',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {name: 'dns'},
    blueprint: bp => ({zone: bp.add(node)}),
  }).toLiveSystem({
    name: 'dns',
    environment: {},
    select: {z: AwsRoute53HostedZone({})},
  });

describe('allowBulkDelete on an environment DNS zone', () => {
  it('is sent as declared', () => {
    const {management} = resolveEnvironment(
      mgmt().withDnsZones([{name: 'fractal.cloud', allowBulkDelete: true}]),
    );
    expect(management.parameters.dnsZones).toEqual([
      {name: 'fractal.cloud', allowBulkDelete: true},
    ]);
  });

  it('is not sent when omitted', () => {
    const {management} = resolveEnvironment(
      mgmt().withDnsZones([{name: 'fractal.cloud'}]),
    );
    expect(management.parameters.dnsZones).toEqual([{name: 'fractal.cloud'}]);
  });

  it('refuses a value that is not a boolean', () => {
    const zone = {
      name: 'fractal.cloud',
      allowBulkDelete: 'yes',
    } as unknown as DnsZone;
    expect(() => resolveEnvironment(mgmt().withDnsZones([zone]))).toThrow(
      /DNS zone 'fractal.cloud': allowBulkDelete must be true or false, got "yes"/,
    );
  });
});

describe('allowBulkDelete on the DNS Zone component', () => {
  it('is recorded and reaches the Route 53 live component', () => {
    const ls = zoneLiveSystem(
      DnsZoneComponent({id: 'z'})
        .withDomainName('fractal.cloud')
        .withAllowBulkDelete(true),
    );
    expect(ls.components[0].parameters.allowBulkDelete).toBe(true);
  });

  it('refuses a value that is not a boolean', () => {
    expect(() =>
      DnsZoneComponent({id: 'z'}).withAllowBulkDelete(1 as unknown as boolean),
    ).toThrow(
      /withAllowBulkDelete: allowBulkDelete must be true or false, got 1/,
    );
  });
});
