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

const HINT_ALIASES: Readonly<Record<string, DnsZoneHostProvider>> = {
  aws: 'AWS',
  route53: 'AWS',
  gcp: 'GCP',
  clouddns: 'GCP',
  azure: 'Azure',
  azuredns: 'Azure',
};

/**
 * The single host a deprecated `dnsZoneType` names, as the control plane reads it:
 * a provider name or alias, or an offer type whose name starts with a provider
 * (`NetworkAndCompute.PaaS.AwsRoute53HostedZone`). `undefined` when it names none.
 */
const hostOfHint = (hint: string): DnsZoneHostProvider | undefined => {
  const trimmed = hint.trim();
  const aliased = HINT_ALIASES[trimmed.toLowerCase()];
  if (aliased !== undefined) {
    return aliased;
  }
  const offer = trimmed.slice(trimmed.lastIndexOf('.') + 1).toLowerCase();
  return HOSTS.find(
    h => offer.length > h.length && offer.startsWith(h.toLowerCase()),
  );
};

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
    if (zone.providers === undefined && zone.dnsZoneType?.trim()) {
      // Deprecated single-provider hint; the control plane reports one that
      // names no provider, so only a recognized one narrows the hosts here.
      const hinted = hostOfHint(zone.dnsZoneType);
      if (hinted !== undefined) {
        hosts = available.filter(h => h === hinted);
      }
    }
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
          `${at} selects ${missing.join(', ')}, but the environment has no ` +
            `${missing.join(' or ')} agent or cloud account.`,
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
