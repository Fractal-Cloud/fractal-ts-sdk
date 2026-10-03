/**
 * dns.test.ts — executable spec for the DNS Zone component.
 *
 * Proves the shared guardrails are recorded and locked on the blueprint, flow
 * unchanged into the Route 53 live component next to the offer's own plumbing,
 * and that a wrong offer is rejected at compile time AND at runtime.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {DnsZoneComponent, DnsZoneGuardrails} from './components/dns';
import type {DnsZone} from './environment/types';
import {AwsRoute53HostedZone} from './offers/dns';
import {Cognito} from './offers/security';

const environment = {};
const boundedContextId = {id: 'dns-templates'};

function authorFractal() {
  return createFractal({
    id: 'public-dns',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const zone = bp.add(
        DnsZoneComponent({id: 'fractal-cloud'})
          .withDomainName('fractal.cloud')
          .withDnssec('required')
          .withRecordManagement('strict')
          .withAllowedRecordTypes(['A', 'CNAME', 'MX', 'TXT', 'CAA'])
          .withTtlBounds({minTtl: 60, maxTtl: 86400})
          .withCaaIssuers(['letsencrypt.org'])
          .withSubdomainDelegation(false)
          .withRecords([
            {name: 'www', type: 'CNAME', ttl: 300, values: ['fractal.cloud.']},
            {
              name: '@',
              type: 'A',
              alias: {
                dnsName: 'd111.cloudfront.net',
                hostedZoneId: 'Z2FDTNDATAQYW2',
              },
            },
          ]),
      );
      return {zone};
    },
    operations: () => ({}),
  });
}

describe('DNS Zone component', () => {
  it('records the guardrails on the blueprint and locks them', () => {
    const zone = authorFractal().blueprint.components.find(
      c => c.id === 'fractal-cloud',
    )!;
    expect(zone.parameters.domainName).toBe('fractal.cloud');
    expect(zone.parameters.dnssec).toBe('required');
    expect(zone.parameters.minTtl).toBe(60);
    expect(zone.parameters.maxTtl).toBe(86400);
    expect(zone.parameters.allowSubdomainDelegation).toBe(false);
    expect(zone.locked).toEqual(
      expect.arrayContaining(['domainName', 'dnssec', 'caaIssuers', 'records']),
    );
  });

  it('Route 53 receives the guardrails plus its own plumbing', () => {
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({
        name: 'dns',
        environment,
        select: {'fractal-cloud': AwsRoute53HostedZone({adoptExisting: true})},
      });

    const zone = ls.components[0];
    expect(zone.type).toBe('NetworkAndCompute.PaaS.AwsRoute53HostedZone');
    expect(zone.provider).toBe('AWS');
    expect(zone.parameters.adoptExisting).toBe(true);
    expect(zone.parameters.caaIssuers).toEqual(['letsencrypt.org']);
    expect(zone.parameters.recordManagement).toBe('strict');
  });

  it('selecting an offer of another component is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          // @ts-expect-error Cognito (IdentityProvider) cannot satisfy NetworkAndCompute.DnsZone
          'fractal-cloud': Cognito({}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });

  it('refuses TTL bounds that are empty or inverted at design time', () => {
    expect(() => DnsZoneComponent({id: 'z'}).withTtlBounds({})).toThrow(
      /needs minTtl, maxTtl or both/,
    );
    expect(() =>
      DnsZoneComponent({id: 'z'}).withTtlBounds({minTtl: 600, maxTtl: 60}),
    ).toThrow(/greater than maxTtl/);
  });

  it('a record cannot carry both values and an alias', () => {
    DnsZoneComponent({id: 'z'}).withRecords([
      // @ts-expect-error values and alias are mutually exclusive
      {
        name: '@',
        type: 'A',
        values: ['192.0.2.1'],
        alias: {dnsName: 'x.', hostedZoneId: 'Z1'},
      },
    ]);
  });

  it('an environment DNS zone carries the same guardrails and records', () => {
    const zone: DnsZone = {
      name: 'fractal.cloud',
      dnssec: 'required',
      recordManagement: 'lax',
      caaIssuers: ['letsencrypt.org'],
      records: [{name: 'www', type: 'CNAME', values: ['fractal.cloud.']}],
    };
    const guardrails: DnsZoneGuardrails = zone;
    expect(guardrails.dnssec).toBe('required');
  });

  const recordManagementOf = (node: ReturnType<typeof DnsZoneComponent>) =>
    createFractal({
      id: 'rm',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({zone: bp.add(node)}),
      operations: () => ({}),
    }).blueprint.components[0].parameters.recordManagement;

  it('strict and lax are recorded as declared', () => {
    expect(
      recordManagementOf(DnsZoneComponent({id: 'z'}).withRecordManagement('strict')),
    ).toBe('strict');
    expect(
      recordManagementOf(DnsZoneComponent({id: 'z'}).withRecordManagement('lax')),
    ).toBe('lax');
  });

  it('omitted, nothing is sent: the agent applies strict', () => {
    const params = createFractal({
      id: 'rm',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({zone: bp.add(DnsZoneComponent({id: 'z'}).withDomainName('a.b'))}),
      operations: () => ({}),
    }).blueprint.components[0].parameters;
    expect('recordManagement' in params).toBe(false);
  });

  it('authoritative is still accepted, and sent as strict', () => {
    expect(
      recordManagementOf(DnsZoneComponent({id: 'z'}).withRecordManagement('authoritative')),
    ).toBe('strict');
  });

  it('a lax zone reaches the Route 53 live component as declared', () => {
    const fractal = createFractal({
      id: 'public-dns-lax',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        zone: bp.add(
          DnsZoneComponent({id: 'z'}).withDomainName('fractal.cloud').withRecordManagement('lax'),
        ),
      }),
      operations: () => ({}),
    });
    const ls = fractal.toLiveSystem({
      name: 'dns',
      environment,
      select: {z: AwsRoute53HostedZone({})},
    });
    expect(ls.components[0].parameters.recordManagement).toBe('lax');
  });

  it('per-record ownership is no longer a value: additive is refused, naming strict and lax', () => {
    expect(() =>
      DnsZoneComponent({id: 'z'}).withRecordManagement(
        'additive' as unknown as 'strict',
      ),
    ).toThrow(
      /withRecordManagement: recordManagement 'additive'.*per-record ownership.*Use 'strict'.*or 'lax'/,
    );
  });

  it('refuses any other value, naming strict and lax', () => {
    expect(() =>
      DnsZoneComponent({id: 'z'}).withRecordManagement('loose' as unknown as 'strict'),
    ).toThrow(/recordManagement 'loose' is not a value.*'strict'.*'lax'/);
  });

  it('a Live System cannot slip additive past the type either', () => {
    const fractal = createFractal({
      id: 'public-dns-raw',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const zone = bp.add(DnsZoneComponent({id: 'z'}).withDomainName('fractal.cloud'));
        return {zone};
      },
      operations: () => ({}),
    });
    expect(() =>
      fractal.toLiveSystem({
        name: 'dns',
        environment,
        select: {
          z: AwsRoute53HostedZone({recordManagement: 'additive'} as unknown as {adoptExisting?: boolean}),
        },
      }),
    ).toThrow(/Live component 'z': recordManagement 'additive'.*'strict'.*'lax'/);
    expect(() =>
      fractal.toLiveSystem({
        name: 'dns',
        environment,
        select: {z: AwsRoute53HostedZone({})},
      }),
    ).not.toThrow();
  });

  it('names a refused value that is not a string as it is', () => {
    expect(() =>
      DnsZoneComponent({id: 'z'}).withRecordManagement(true as unknown as 'strict'),
    ).toThrow(/recordManagement true is not a value.*'strict'.*'lax'/);
  });
});
