/**
 * dns_record_management_wire.test.ts — what `recordManagement` looks like on
 * the wire. The SDK sends exactly the value chosen (`'authoritative'` or
 * `'lax'`) on every path, and nothing when no value is chosen: the agents then
 * apply `'authoritative'`, the default. Any other value is refused before
 * anything is sent.
 */

import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {DnsZoneComponent} from './components/dns';
import {type DnsRecordManagement} from './components/dns_record_management_mode';
import {AwsRoute53HostedZone} from './offers/dns';
import {
  ManagementEnvironment,
  OperationalEnvironment,
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

const operationWire = (value?: string): Record<string, unknown> => {
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
  const specialized =
    value === undefined
      ? fractal.specialize()
      : fractal.specialize().withRecordManagement(value);
  return specialized.toLiveSystem({name: 'dns', environment, select})
    .components[0].parameters;
};

describe('recordManagement on the wire', () => {
  it('environment dnsZones: sends the chosen value, and nothing when unset', () => {
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
    expect('recordManagement' in environmentWire({name: 'fractal.cloud'})).toBe(
      false,
    );
  });

  it('operational environment dnsZones: sends the chosen value, and nothing when unset', () => {
    const operationalWire = (zone: DnsZone): Record<string, unknown> => {
      const {operationals} = resolveEnvironment(
        ManagementEnvironment({
          id: {type: 'Organizational', ownerId: OWNER, shortName: 'mgmt'},
          resourceGroups: [`Organizational/${OWNER}/rg`],
        })
          .withGcpCloudAgent({
            region: 'europe-west1',
            organizationId: 'o',
            projectId: 'p',
          })
          .withOperationalEnvironment(
            OperationalEnvironment({shortName: 'prod'})
              .withResourceGroup(`Organizational/${OWNER}/rg`)
              .withDnsZones([zone]),
          ),
      );
      return (
        operationals[0].parameters.dnsZones as Record<string, unknown>[]
      )[0];
    };
    expect(
      operationalWire({
        name: 'fractal.cloud',
        recordManagement: 'authoritative',
      }).recordManagement,
    ).toBe('authoritative');
    expect(
      operationalWire({name: 'fractal.cloud', recordManagement: 'lax'})
        .recordManagement,
    ).toBe('lax');
    expect('recordManagement' in operationalWire({name: 'fractal.cloud'})).toBe(
      false,
    );
  });

  it('DnsZoneComponent and AwsRoute53HostedZone: sends the chosen value, and nothing when unset', () => {
    expect(builderWire('authoritative').recordManagement).toBe('authoritative');
    expect(builderWire('lax').recordManagement).toBe('lax');
    expect('recordManagement' in builderWire()).toBe(false);
  });

  it('an Interface operation: sends the chosen value, and nothing when never called', () => {
    expect(operationWire('authoritative').recordManagement).toBe(
      'authoritative',
    );
    expect(operationWire('lax').recordManagement).toBe('lax');
    expect('recordManagement' in operationWire()).toBe(false);
  });

  it('refuses strict on every path, naming authoritative and lax', () => {
    const names = /'authoritative'.*'lax'/s;
    expect(() =>
      environmentWire({
        name: 'fractal.cloud',
        recordManagement: 'strict',
      } as unknown as DnsZone),
    ).toThrow(names);
    expect(() =>
      builderWire('strict' as unknown as DnsRecordManagement),
    ).toThrow(names);
    expect(() => operationWire('strict')).toThrow(names);
  });
});
