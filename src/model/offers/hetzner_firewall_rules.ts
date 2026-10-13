/**
 * offers/hetzner_firewall_rules.ts — neutral egress rules in aria-agent-hetzner's
 * shape.
 *
 * A neutral rule names its peer as `sourceCidr` whichever direction it faces;
 * the cloud agents read it that way for egress too. The Hetzner agent's egress
 * rule names the peer `destCidr` and refuses a rule without one, so an egress
 * rule forwarded as-is fails the firewall.
 */
import type {VendorParameters} from './vendor_parameters';

const toHetznerEgressRule = (rule: unknown): unknown => {
  if (typeof rule !== 'object' || rule === null || !('sourceCidr' in rule)) {
    return rule;
  }
  const {sourceCidr, ...rest} = rule as Record<string, unknown>;
  return {...rest, destCidr: sourceCidr};
};

export const toHetznerEgressRules: VendorParameters = (
  _componentId,
  parameters,
) => {
  if (!Array.isArray(parameters.egressRules)) {
    return parameters;
  }
  return {
    ...parameters,
    egressRules: parameters.egressRules.map(toHetznerEgressRule),
  };
};
