/**
 * Type-level assertions for the API-management offers' config types, checked by `npm run
 * typecheck` (see storage.test-d.ts for why these are not in a `.test.ts`).
 */
import {AwsCloudFront, TraefikGateway} from './api_management';

// A static site from a linked bucket: both site keys are optional.
AwsCloudFront({aliases: ['docs.example.com']});
AwsCloudFront({
  aliases: ['docs.example.com'],
  defaultRootObject: 'index.html',
  spaFallback: true,
});
// @ts-expect-error `spaFallback` is a boolean.
AwsCloudFront({spaFallback: 'true'});
// @ts-expect-error `rootObject` is not a key of this config — the agent reads `defaultRootObject`.
AwsCloudFront({rootObject: 'index.html'});

// A classic static site: the object served with 404 for a missing key.
AwsCloudFront({aliases: ['docs.example.com'], errorDocument: '404.html'});
// @ts-expect-error `notFoundPage` is not a key of this config — the agent reads `errorDocument`.
AwsCloudFront({notFoundPage: '404.html'});

// ── TraefikGateway: Traefik-terminated TLS, workload exemptions, agent keys ──
TraefikGateway({});
TraefikGateway({
  host: 'api.example.com',
  tlsClusterIssuer: 'letsencrypt',
  tlsSecretName: 'traefik-tls',
  tlsHosts: ['api.example.com', '*.apps.example.com'],
  plainHttp: true,
  forwardAuthAddress: 'http://ocelot.platform.svc.cluster.local/auth',
  forwardAuthExemptComponentIds: [
    'ocelot',
    'Organizational/acme/ops/shared/grafana',
  ],
  loadBalancerSourceRanges: ['10.0.0.0/8'],
  values: {logs: {access: {enabled: true}}},
});
// @ts-expect-error `tlsHosts` is a list, even of one host.
TraefikGateway({tlsHosts: 'api.example.com'});
// @ts-expect-error `plainHttp` is a boolean.
TraefikGateway({plainHttp: 'false'});
// @ts-expect-error `forwardAuthExemptComponentIds` is a list.
TraefikGateway({forwardAuthExemptComponentIds: 'ocelot'});
// @ts-expect-error `loadBalancerSourceRanges` is a list of CIDRs.
TraefikGateway({loadBalancerSourceRanges: '10.0.0.0/8'});
// @ts-expect-error `forwardAuthExcludedPrefixes` was removed: a path never exempts a route.
TraefikGateway({forwardAuthExcludedPrefixes: ['/ocelot/']});
