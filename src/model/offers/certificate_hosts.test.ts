/**
 * certificate_hosts.test.ts — the hosts a TraefikGateway's certificate covers.
 * A gateway issuing its own certificate gets one naming the hosts whose zone
 * grants it TXT write, and only those (aria-agent-caas-k8s issuancePlan: the
 * certificate names the covered hosts); an operator Secret covers every host.
 */
import {describe, expect, it} from 'vitest';
import {gatewayCertificateHosts} from './certificate_hosts';

const txt = (name: string) => ({name, access: {TXT: 'write'}});

describe('gatewayCertificateHosts', () => {
  it('names only the hosts whose zone grants TXT write', () => {
    expect(
      gatewayCertificateHosts({
        tlsHosts: 'api.example.com,www.other.org',
        dnsZones: [
          txt('example.com'),
          {name: 'other.org', access: {A: 'write'}},
        ],
      }),
    ).toEqual(['api.example.com']);
  });

  it('is undefined when no host can be issued for', () => {
    expect(
      gatewayCertificateHosts({
        tlsHosts: 'www.other.org',
        dnsZones: [txt('example.com')],
      }),
    ).toBeUndefined();
  });

  it('covers every host with an operator Secret', () => {
    expect(
      gatewayCertificateHosts({
        tlsSecretName: 'api-tls',
        tlsHosts: 'api.example.com,www.other.org',
      }),
    ).toEqual(['api.example.com', 'www.other.org']);
  });

  it('takes host when no tlsHosts are listed', () => {
    expect(
      gatewayCertificateHosts({
        host: 'api.example.com',
        dnsZones: [txt('example.com')],
      }),
    ).toEqual(['api.example.com']);
  });
});
