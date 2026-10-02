/**
 * dns.test.ts — executable spec for the DNS Zone component.
 *
 * Proves the shared guardrails are recorded and locked on the blueprint, flow
 * unchanged into the Route 53 live component next to the offer's own plumbing,
 * and that a wrong offer is rejected at compile time AND at runtime.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {DnsZoneComponent} from './components/dns';
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
          .withRecordManagement('additive')
          .withAllowedRecordTypes(['A', 'CNAME', 'MX', 'TXT', 'CAA'])
          .withTtlBounds({minTtl: 60, maxTtl: 86400})
          .withCaaIssuers(['letsencrypt.org'])
          .withSubdomainDelegation(false)
          .withRecords([
            {name: 'www', type: 'CNAME', ttl: 300, values: ['fractal.cloud.']},
            {
              name: '@',
              type: 'A',
              alias: {dnsName: 'd111.cloudfront.net', hostedZoneId: 'Z2FDTNDATAQYW2'},
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
    expect(zone.parameters.recordManagement).toBe('additive');
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
});
