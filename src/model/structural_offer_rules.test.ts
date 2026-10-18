/**
 * structural_offer_rules.test.ts — the rules an offer still checks by hand:
 * how several of its parameters combine, which the agents' contracts cannot
 * express. Single parameter values are checked against the agent's published
 * contract instead (offer_config_contract.test.ts), never by hand.
 */
import {describe, expect, it} from 'vitest';
import {createFractal, type LiveSystemComponent} from './core';
import {ApiGateway} from './components/api_management';
import {ObjectStorage} from './components/storage';
import {AwsCloudFront, TraefikGateway} from './offers/api_management';
import {AwsS3} from './offers/storage';

const environment = {};
const boundedContextId = {name: 'platform'};
const version = {major: 1, minor: 0, patch: 0};

const gatewayComponent = (
  id: string,
  offer: unknown,
  bucket = false,
): LiveSystemComponent =>
  createFractal({
    id: 'structural',
    version,
    boundedContextId,
    blueprint: bp => {
      const main = bp.add(ApiGateway({id}));
      if (bucket) {
        const b = bp.add(ObjectStorage({id: 'bucket'}));
        bp.link(main, b, {access: 'read'});
        return {main, b};
      }
      return {main};
    },
  })
    .toLiveSystem({
      name: 'platform',
      environment,
      select: {[id]: offer, ...(bucket ? {bucket: AwsS3({})} : {})} as never,
    })
    .components.find(c => c.id === id)!;

describe('AwsCloudFront', () => {
  it('refuses spaFallback together with errorDocument', () => {
    expect(() =>
      gatewayComponent(
        'edge',
        AwsCloudFront({spaFallback: true, errorDocument: '404.html'} as never),
        true,
      ),
    ).toThrow(
      "Live component 'edge': spaFallback answers every missing key with the root object",
    );
  });
});

const gateway = (config: Record<string, unknown>) =>
  gatewayComponent('traefik', TraefikGateway(config as never));

describe('TraefikGateway', () => {
  it.each([
    [
      {forwardAuthRequestHeaders: ['x-ok']},
      'ForwardAuth settings without forwardAuthAddress do nothing',
    ],
    [
      {forwardAuthExcludedPrefixes: '/health'},
      'forwardAuthExcludedPrefixes was removed: the agent no longer reads it and a path never exempts a route. Exempt workloads with forwardAuthExemptComponentIds',
    ],
    [
      {tlsSecretName: 'api-tls'},
      'TLS needs the hosts the certificate covers: set tlsHosts, or host',
    ],
    [
      {
        tlsSecretName: 'api-tls',
        host: 'api.other.com',
        tlsHosts: ['*.example.com'],
      },
      "host 'api.other.com', the default host of every route, is not covered by tlsHosts *.example.com",
    ],
    [
      {plainHttp: false},
      'plainHttp is false and the gateway has no TLS (tlsSecretName, or dnsZones with TXT write on the zone of its hosts): it would serve nothing',
    ],
    [
      {
        tlsSecretName: 'api-tls',
        host: 'api.example.com',
        tlsCertificateArn:
          'arn:aws:acm:eu-west-1:111122223333:certificate/abc-123',
      },
      "tlsCertificateArn and Traefik TLS (tlsSecretName, or the gateway's own certificate) both need port 443: choose one",
    ],
  ])('refuses %o', (config, why) => {
    expect(() => gateway(config)).toThrow(`Live component 'traefik': ${why}.`);
  });

  it('accepts a TLS gateway whose keys combine', () => {
    expect(() =>
      gateway({
        tlsSecretName: 'api-tls',
        host: 'api.example.com',
        tlsHosts: ['*.example.com'],
        plainHttp: false,
        forwardAuthAddress: 'http://auth.security.svc:8080/',
        forwardAuthRequestHeaders: ['authorization'],
      }),
    ).not.toThrow();
  });

  it('checks a single value against the contract, not by hand', () => {
    expect(() => gateway({replicas: 1.5})).toThrow(
      "Live component 'traefik': 1.5 is not the integer 'replicas' takes.",
    );
  });
});
