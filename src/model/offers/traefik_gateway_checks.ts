/**
 * The checks of a `TraefikGateway`'s own parameters, mirroring
 * aria-agent-caas-k8s `internal/reconciler/handlers/traefik_gateway_settings.go`
 * (`TraefikGatewaySettingsFrom`, `readTLS`), so a gateway the agent would fail
 * is refused while the Live System is being built. Internal: not re-exported
 * from the model barrel.
 */
import type {LiveSystemComponent} from '../core';
import {isKubernetesName} from './kubernetes_name';
import {
  certificateCovers,
  gatewayCertificateHosts,
  isCertificateHost,
} from './certificate_hosts';
import {
  ensureNamespace,
  hasMalformedEscape,
  isCidr,
  isWholeAtLeastOne,
  refuseCaas,
} from './caas_param_checks';
import type {TraefikGatewayConfig} from './traefik_gateway_config';

/** An HTTP header name (RFC 9110 token). */
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
/** What a gateway `host` may be: dot-separated labels of letters, digits and inner hyphens. */
const HOST_NAME =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const ACM_CERTIFICATE_ARN =
  /^arn:aws[a-z-]*:acm:[a-z0-9-]+:\d{12}:certificate\/[A-Za-z0-9-]+$/;

/** One dot-separated atom of an address, as Go's `net/mail` reads one. */
const ATOM = '[^\\s@<>()[\\]\\\\,;:".]+';
/**
 * A bare address `net/mail` reads back unchanged, which the agent requires of
 * `acmeEmail` (`certmanager.ClusterIssuer.Validate`).
 */
const EMAIL = new RegExp(`^${ATOM}(\\.${ATOM})*@${ATOM}(\\.${ATOM})*$`);

/** `acmeServer` as `certmanager.ACMEServerURL` reads it. */
const isAcmeServer = (value: string): boolean =>
  ['', 'production', 'staging'].includes(value.trim().toLowerCase()) ||
  (/^https:\/\/[^\s/?#]+([/?#]\S*)?$/i.test(value.trim()) &&
    !hasMalformedEscape(value));

const trimmed = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** ForwardAuth: settings only an address uses, header names, exempt ids, body size. */
const ensureForwardAuth = (id: string, config: TraefikGatewayConfig): void => {
  const anyOther = Object.entries(config).some(
    ([k, v]) =>
      k.startsWith('forwardAuth') &&
      k !== 'forwardAuthAddress' &&
      v !== undefined,
  );
  if (config.forwardAuthAddress === undefined && anyOther) {
    refuseCaas(
      id,
      'ForwardAuth settings without forwardAuthAddress do nothing',
    );
  }
  for (const key of [
    'forwardAuthRequestHeaders',
    'forwardAuthResponseHeaders',
  ] as const) {
    const bad = (config[key] ?? []).find(h => !HEADER_NAME.test(h.trim()));
    if (bad !== undefined) {
      refuseCaas(id, `${key} holds '${bad}', which is not a header name`);
    }
  }
  const badExempt = (config.forwardAuthExemptComponentIds ?? []).find(
    c =>
      c.trim() === '' ||
      c.trim().startsWith('/') ||
      c.trim().endsWith('/') ||
      c.includes(','),
  );
  if (badExempt !== undefined) {
    refuseCaas(
      id,
      `forwardAuthExemptComponentIds entry '${badExempt}' is neither a component id nor <liveSystemId>/<componentId>`,
    );
  }
  const size: unknown = config.forwardAuthMaxBodySize;
  if (size !== undefined && !isWholeAtLeastOne(size)) {
    refuseCaas(
      id,
      `forwardAuthMaxBodySize ${String(size)} is not a whole number of bytes of at least 1`,
    );
  }
};

/**
 * TLS as `readTLS` refuses it: an operator Secret's name, the certificate
 * hosts, `host` covered by `tlsHosts`, hosts for a Secret, no `plainHttp:
 * false` without TLS, and no NLB TLS listener (`tlsCertificateArn`) together
 * with Traefik TLS. `tlsHosts` without a certificate source is refused by the
 * offer's `validate`.
 */
const ensureTls = (self: LiveSystemComponent, config: TraefikGatewayConfig) => {
  const id = self.id;
  const secret = trimmed(config.tlsSecretName);
  if (secret !== '' && !isKubernetesName(secret)) {
    refuseCaas(
      id,
      `tlsSecretName '${config.tlsSecretName}' is not a Kubernetes name`,
    );
  }
  const host = trimmed(config.host);
  const declared = (config.tlsHosts ?? [])
    .map(h => h.trim())
    .filter(h => h !== '');
  const zones = Array.isArray(self.parameters.dnsZones)
    ? self.parameters.dnsZones.length
    : 0;
  const source =
    secret !== '' || trimmed(config.tlsClusterIssuer) !== '' || zones > 0;
  const hosts =
    declared.length > 0 ? declared : host !== '' && source ? [host] : [];
  const bad = hosts.find(h => !isCertificateHost(h));
  if (bad !== undefined) {
    refuseCaas(
      id,
      `tlsHosts entry '${bad}' is not a host name or a one-label wildcard (*.example.com)`,
    );
  }
  if (
    host !== '' &&
    declared.length > 0 &&
    !certificateCovers(declared, host)
  ) {
    refuseCaas(
      id,
      `host '${config.host}', the default host of every route, is not covered by tlsHosts ${declared.join(',')}`,
    );
  }
  if (secret !== '' && hosts.length === 0) {
    refuseCaas(
      id,
      'TLS needs the hosts the certificate covers: set tlsHosts, or host',
    );
  }
  const tls = gatewayCertificateHosts(self.parameters) !== undefined;
  if (!tls && config.plainHttp === false) {
    refuseCaas(
      id,
      'plainHttp is false and the gateway has no TLS (tlsSecretName, or dnsZones with TXT ' +
        'write on the zone of its hosts): it would serve nothing',
    );
  }
  if (tls && trimmed(config.tlsCertificateArn) !== '') {
    refuseCaas(
      id,
      "tlsCertificateArn and Traefik TLS (tlsSecretName, or the gateway's own certificate) " +
        'both need port 443: choose one',
    );
  }
};

/** Every check of the gateway's own parameters. */
export const ensureTraefikGatewayParameters = (
  self: LiveSystemComponent,
  config: TraefikGatewayConfig,
): void => {
  const id = self.id;
  if (self.parameters.forwardAuthExcludedPrefixes !== undefined) {
    refuseCaas(
      id,
      'forwardAuthExcludedPrefixes was removed: the agent no longer reads it and a path ' +
        'never exempts a route. Exempt workloads with forwardAuthExemptComponentIds',
    );
  }
  ensureNamespace(id, config.namespace);
  ensureForwardAuth(id, config);
  const badRange = (config.loadBalancerSourceRanges ?? []).find(
    r => !isCidr(r.trim()),
  );
  if (badRange !== undefined) {
    refuseCaas(
      id,
      `loadBalancerSourceRanges entry '${badRange}' is not a CIDR`,
    );
  }
  if (config.host !== undefined && !HOST_NAME.test(trimmed(config.host))) {
    refuseCaas(id, `host '${config.host}' is not a host name`);
  }
  const replicas: unknown = config.replicas;
  if (replicas !== undefined && !isWholeAtLeastOne(replicas)) {
    refuseCaas(
      id,
      `replicas ${String(replicas)} is not a whole number of at least 1`,
    );
  }
  const idle: unknown = config.entryPointIdleTimeoutSeconds;
  if (idle !== undefined && !isWholeAtLeastOne(idle)) {
    refuseCaas(
      id,
      `entryPointIdleTimeoutSeconds ${String(idle)} is not a whole number of seconds of at least 1`,
    );
  }
  const arn = trimmed(config.tlsCertificateArn);
  if (arn !== '' && !ACM_CERTIFICATE_ARN.test(arn)) {
    refuseCaas(
      id,
      `tlsCertificateArn '${config.tlsCertificateArn}' is not an ACM certificate ARN`,
    );
  }
  const email: unknown = config.acmeEmail;
  if (typeof email === 'string' && email !== '' && !EMAIL.test(email.trim())) {
    refuseCaas(id, `acmeEmail '${email}' is not an email address`);
  }
  const server: unknown = config.acmeServer;
  if (
    server !== undefined &&
    !(typeof server === 'string' && isAcmeServer(server))
  ) {
    refuseCaas(
      id,
      `acmeServer '${String(server)}' is neither production, staging nor an https ACME directory URL`,
    );
  }
  ensureTls(self, config);
};
