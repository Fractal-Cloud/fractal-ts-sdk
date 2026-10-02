/**
 * environment/dns_zone_providers.ts — checks which clouds may host the DNS zones
 * an environment declares, against the clouds the environment has agents for.
 * The control plane enforces the same rules; checking here fails a deploy before
 * anything is written.
 */
import type {DnsZone, DnsZoneHostProvider} from './types';

const HOSTS: readonly DnsZoneHostProvider[] = ['AWS', 'GCP', 'Azure'];

/** The DNS host a cloud-agent provider name (`AWS`, `AZURE`, `GCP`, ...) stands for. */
const hostOf = (provider: string): DnsZoneHostProvider | undefined =>
  HOSTS.find(h => h.toUpperCase() === provider.toUpperCase());

/**
 * Errors for `zones` declared on an environment whose agents (or operational
 * cloud accounts) are of `agentProviders`, each prefixed with `label`.
 */
export const validateDnsZoneProviders = (
  label: string,
  zones: readonly DnsZone[],
  agentProviders: readonly string[],
): string[] => {
  const available = HOSTS.filter(h =>
    agentProviders.some(p => hostOf(p) === h),
  );
  const errors: string[] = [];
  for (const zone of zones) {
    const at = `${label}: DNS zone '${zone.name}'`;
    let hosts: readonly DnsZoneHostProvider[] = available;
    if (zone.providers !== undefined) {
      if (zone.providers.length === 0) {
        errors.push(`${at}: providers is empty; omit it to use every agent.`);
        continue;
      }
      const unknown = zone.providers.filter(
        p => hostOf(String(p)) === undefined,
      );
      if (unknown.length > 0) {
        errors.push(
          `${at}: '${unknown.join("', '")}' is not a DNS provider; use ${HOSTS.join(', ')}.`,
        );
        continue;
      }
      const selected = HOSTS.filter(h =>
        zone.providers!.some(p => hostOf(p) === h),
      );
      const missing = selected.filter(h => !available.includes(h));
      if (missing.length > 0) {
        errors.push(
          `${at} selects ${missing.join(', ')}, but the environment has no ${missing.join(' or ')} agent.`,
        );
      }
      hosts = selected.filter(h => available.includes(h));
    }
    if (zone.dnssec === 'required' && hosts.length > 1) {
      errors.push(
        `${at} has dnssec 'required' and would be hosted by several providers (${hosts.join(', ')}): ` +
          'one zone signed by several providers needs multi-signer DNSSEC (RFC 8901), which is not ' +
          "supported. Select one provider, or use dnssec 'optional' (served unsigned) or 'disabled'.",
      );
    }
  }
  return errors;
};
