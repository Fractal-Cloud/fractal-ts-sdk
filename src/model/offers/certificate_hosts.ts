/**
 * The certificate-host rules of the caas-k8s Traefik gateway, as the agent applies
 * them (`internal/gateway/traefik/certificate_hosts.go`). Internal: not re-exported
 * from the model barrel.
 */
import {isKubernetesName} from './caas_param_checks';

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

/**
 * The hosts the certificate of an emitted `TraefikGateway` component covers, or
 * undefined when Traefik does not terminate TLS (or the component is a reference,
 * whose parameters are not known here). As the agent reads them: TLS is on iff
 * `tlsSecretName` or `tlsClusterIssuer` is set, and `tlsHosts` defaults to `host`.
 */
export const gatewayCertificateHosts = (
  parameters: Readonly<Record<string, unknown>>,
): readonly string[] | undefined => {
  const tls =
    setString(parameters.tlsSecretName) !== undefined ||
    setString(parameters.tlsClusterIssuer) !== undefined;
  if (!tls) {
    return undefined;
  }
  const listed = (setString(parameters.tlsHosts) ?? '')
    .split(',')
    .map(h => h.trim())
    .filter(h => h !== '');
  if (listed.length > 0) {
    return listed;
  }
  const host = setString(parameters.host);
  return host === undefined ? [] : [host];
};
