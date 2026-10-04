/**
 * dns_record_management_wire.test.ts — what `recordManagement` looks like on
 * the wire. Cloud agents up to 8.21 accept only `'authoritative'` and fail a
 * zone carrying any other value, so the SDK sends `'authoritative'` for
 * `'strict'`, for `'authoritative'` and when the value is omitted, and `'lax'`
 * only when it is chosen.
 */

import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {DnsZoneComponent} from './components/dns';
import {type DnsRecordManagement} from './components/dns_record_management_mode';
import {AwsRoute53HostedZone} from './offers/dns';
import {
  ManagementEnvironment,
  resolveEnvironment,
  type DnsZone,
} from './environment/index';

const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const environment = {};
const boundedContextId = {id: 'dns-wire'};
const select = {z: AwsRoute53HostedZone({})};

const environmentWire = (zone: DnsZone): Record<string, unknown> => {
  const {management} = resolveEnvironment(
    ManagementEnvironment({
      id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
      resourceGroups: [`Organizational/${OWNER}/rg`],
    })
      .withGcpCloudAgent({
        region: 'europe-west1',
        organizationId: 'o',
        projectId: 'p',
      })
      .withDnsZones([zone]),
  );
  return (management.parameters.dnsZones as Record<string, unknown>[])[0];
};

const builderWire = (value?: DnsRecordManagement): Record<string, unknown> => {
  const fractal = createFractal({
    id: 'dns-wire-builder',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const component = DnsZoneComponent({id: 'z'}).withDomainName(
        'fractal.cloud',
      );
      return {
        zone: bp.add(
          value === undefined
            ? component
            : component.withRecordManagement(value),
        ),
      };
    },
    operations: () => ({}),
  });
  return fractal.toLiveSystem({name: 'dns', environment, select}).components[0]
    .parameters;
};

const operationWire = (value: string): Record<string, unknown> => {
  const fractal = createFractal({
    id: 'dns-wire-operation',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => ({
      zone: bp.add(DnsZoneComponent({id: 'z'}).withDomainName('fractal.cloud')),
    }),
    operations: s => ({
      withRecordManagement: (v: string) => s.zone.set('recordManagement', v),
    }),
  });
  return fractal
    .specialize()
    .withRecordManagement(value)
    .toLiveSystem({name: 'dns', environment, select}).components[0].parameters;
};

describe('recordManagement on the wire', () => {
  it('environment dnsZones: strict, authoritative and unset go as authoritative, lax as lax', () => {
    expect(
      environmentWire({name: 'fractal.cloud', recordManagement: 'strict'})
        .recordManagement,
    ).toBe('authoritative');
    expect(
      environmentWire({
        name: 'fractal.cloud',
        recordManagement: 'authoritative',
      }).recordManagement,
    ).toBe('authoritative');
    expect(
      environmentWire({name: 'fractal.cloud', recordManagement: 'lax'})
        .recordManagement,
    ).toBe('lax');
    expect(environmentWire({name: 'fractal.cloud'}).recordManagement).toBe(
      'authoritative',
    );
  });

  it('DnsZoneComponent: strict, authoritative and unset go as authoritative, lax as lax', () => {
    expect(builderWire('strict').recordManagement).toBe('authoritative');
    expect(builderWire('authoritative').recordManagement).toBe('authoritative');
    expect(builderWire('lax').recordManagement).toBe('lax');
    expect(builderWire().recordManagement).toBe('authoritative');
  });

  it('an Interface operation: strict and authoritative go as authoritative, lax as lax', () => {
    expect(operationWire('strict').recordManagement).toBe('authoritative');
    expect(operationWire('authoritative').recordManagement).toBe(
      'authoritative',
    );
    expect(operationWire('lax').recordManagement).toBe('lax');
  });

  it('never sends strict', () => {
    const sent = [
      environmentWire({name: 'fractal.cloud', recordManagement: 'strict'})
        .recordManagement,
      builderWire('strict').recordManagement,
      operationWire('strict').recordManagement,
    ];
    expect(sent).not.toContain('strict');
  });
});
