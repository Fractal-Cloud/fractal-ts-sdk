/**
 * The certificate-host rules of the caas-k8s Traefik gateway, as the agent applies
 * them (`internal/gateway/traefik/certificate_hosts.go`). Internal: not re-exported
 * from the model barrel.
 */
import {isKubernetesName} from './kubernetes_name';

/** What a certificate host in `tlsHosts` may be, once a leading `*.` is set aside. */
export const isCertificateHost = (host: string): boolean => {
  const name = host.startsWith('*.') ? host.slice(2) : host;
  return (
    !name.includes('*') &&
    name.includes('.') &&
    isKubernetesName(name.toLowerCase())
  );
};

/**
 * Whether a certificate for `hosts` is valid for `host`, as a TLS client checks
 * it: an exact name, case-insensitively, or `*.parent` standing for exactly one
 * label in front of `parent`. Callers pass values already trimmed as the agent
 * that reads them trims them.
 */
export const certificateCovers = (
  hosts: readonly string[],
  host: string,
): boolean => {
  const wanted = host.replace(/\.$/, '').toLowerCase();
  return hosts.some(h => {
    const name = h.replace(/\.$/, '').toLowerCase();
    if (name === wanted) {
      return true;
    }
    if (!name.startsWith('*.')) {
      return false;
    }
    const dot = wanted.indexOf('.');
    return dot > 0 && wanted.slice(dot + 1) === name.slice(2);
  });
};

const setString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** A DNS name as the agent compares them: trimmed, lower case, no trailing dot. */
const dnsName = (name: string): string =>
  name.trim().replace(/\.$/, '').toLowerCase();

/** The gateway's `dnsZones` as the agent reads them: zone name to access map. */
const requestedZones = (
  value: unknown,
): ReadonlyArray<{name: string; access: Readonly<Record<string, string>>}> =>
  (Array.isArray(value) ? value : []).flatMap(entry => {
    if (entry === null || typeof entry !== 'object') {
      return [];
    }
    const {name, access} = entry as {name?: unknown; access?: unknown};
    if (typeof name !== 'string' || name.trim() === '') {
      return [];
    }
    const levels: Record<string, string> = {};
    if (access !== null && typeof access === 'object') {
      for (const [type, level] of Object.entries(access)) {
        if (typeof level === 'string') {
          levels[type.trim().toUpperCase()] = level.trim().toLowerCase();
        }
      }
    }
    return [{name: dnsName(name), access: levels}];
  });

/** Write on TXT records: TXT itself, or `'*'` when TXT is not named. */
const txtWrite = (access: Readonly<Record<string, string>>): boolean =>
  'TXT' in access ? access.TXT === 'write' : access['*'] === 'write';

/**
 * The zone a certificate host's DNS-01 challenge is written in: the longest of
 * `zones` that is the host or a parent of it (`*.a.b` is challenged at `a.b`).
 */
const zoneOf = (host: string, zones: readonly string[]): string | undefined =>
  zones
    .filter(zone => {
      const name = dnsName(host).replace(/^\*\./, '');
      return name === zone || name.endsWith(`.${zone}`);
    })
    .sort((a, b) => b.length - a.length)[0];

/**
 * The hosts the certificate of an emitted `TraefikGateway` component covers, or
 * undefined when Traefik does not terminate TLS (or the component is a reference,
 * whose parameters are not known here). TLS is on when `tlsSecretName` is set, or
 * when the gateway issues its own certificate: its `dnsZones` ask for TXT write
 * on the zone of one of its hosts. `tlsHosts` defaults to `host`, as the agent
 * reads them. The ignored `tlsClusterIssuer` is no certificate source: the agent
 * requests nothing from it and only keeps serving a certificate that issuer
 * already wrote, which a Live System being built cannot know of
 * (`TraefikGateway` refuses it as the only source). Whether the grant is in
 * force is known only at reconciliation; until it is, the gateway is in
 * progress.
 */
export const gatewayCertificateHosts = (
  parameters: Readonly<Record<string, unknown>>,
): readonly string[] | undefined => {
  const secret = setString(parameters.tlsSecretName) !== undefined;
  const issuer = setString(parameters.tlsClusterIssuer) !== undefined;
  const zones = requestedZones(parameters.dnsZones);
  const listed = (setString(parameters.tlsHosts) ?? '')
    .split(',')
    .map(h => h.trim())
    .filter(h => h !== '');
  const host = setString(parameters.host);
  const hosts =
    listed.length > 0
      ? listed
      : host !== undefined && (secret || issuer || zones.length > 0)
        ? [host]
        : [];
  const names = zones.map(z => z.name);
  const issues =
    !secret &&
    hosts.some(h => {
      const zone = zoneOf(h, names);
      return zones.some(z => z.name === zone && txtWrite(z.access));
    });
  return secret || issues ? hosts : undefined;
};
