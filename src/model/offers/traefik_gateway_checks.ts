/**
 * The structural rules of a `TraefikGateway`'s parameters: how several of them
 * combine, as aria-agent-caas-k8s refuses them
 * (`internal/reconciler/handlers/traefik_gateway_settings.go`, `readTLS`).
 * Single parameter values are not checked here: value constraints come from
 * the agent's published contract (`contractConfigProblem`). Internal: not
 * re-exported from the model barrel.
 */
import type {LiveSystemComponent} from '../core';
import {certificateCovers, gatewayCertificateHosts} from './certificate_hosts';
import type {TraefikGatewayConfig} from './traefik_gateway_config';

const refuse = (id: string, why: string): never => {
  throw new Error(`Live component '${id}': ${why}.`);
};

const trimmed = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * TLS as `readTLS` combines its keys: `host` covered by `tlsHosts`, hosts for
 * a Secret, no `plainHttp: false` without TLS, and no NLB TLS listener
 * (`tlsCertificateArn`) together with Traefik TLS. `tlsHosts` without a
 * certificate source is refused by the offer's `validate`.
 */
const ensureTls = (
  self: LiveSystemComponent,
  config: TraefikGatewayConfig,
): void => {
  const id = self.id;
  const secret = trimmed(config.tlsSecretName);
  const host = trimmed(config.host);
  const declared = (config.tlsHosts ?? [])
    .map(h => h.trim())
    .filter(h => h !== '');
  if (
    host !== '' &&
    declared.length > 0 &&
    !certificateCovers(declared, host)
  ) {
    refuse(
      id,
      `host '${config.host}', the default host of every route, is not covered by tlsHosts ${declared.join(',')}`,
    );
  }
  if (secret !== '' && declared.length === 0 && host === '') {
    refuse(
      id,
      'TLS needs the hosts the certificate covers: set tlsHosts, or host',
    );
  }
  const tls = gatewayCertificateHosts(self.parameters) !== undefined;
  if (!tls && config.plainHttp === false) {
    refuse(
      id,
      'plainHttp is false and the gateway has no TLS (tlsSecretName, or dnsZones with TXT ' +
        'write on the zone of its hosts): it would serve nothing',
    );
  }
  if (tls && trimmed(config.tlsCertificateArn) !== '') {
    refuse(
      id,
      "tlsCertificateArn and Traefik TLS (tlsSecretName, or the gateway's own certificate) " +
        'both need port 443: choose one',
    );
  }
};

/** The structural rules of the gateway's own parameters. */
export const ensureTraefikGatewayParameters = (
  self: LiveSystemComponent,
  config: TraefikGatewayConfig,
): void => {
  const id = self.id;
  // A key no agent reads any more, refused rather than silently ignored.
  if (self.parameters.forwardAuthExcludedPrefixes !== undefined) {
    refuse(
      id,
      'forwardAuthExcludedPrefixes was removed: the agent no longer reads it and a path ' +
        'never exempts a route. Exempt workloads with forwardAuthExemptComponentIds',
    );
  }
  // The other ForwardAuth keys configure the middleware forwardAuthAddress makes.
  const anyOther = Object.entries(config).some(
    ([k, v]) =>
      k.startsWith('forwardAuth') &&
      k !== 'forwardAuthAddress' &&
      v !== undefined,
  );
  if (config.forwardAuthAddress === undefined && anyOther) {
    refuse(id, 'ForwardAuth settings without forwardAuthAddress do nothing');
  }
  ensureTls(self, config);
};
