/**
 * offers/iaas_placement_rules.ts — the placement rules of IaaS atoms that need
 * more than a dependency of the right type.
 *
 * IaaS components are atoms: each is placed only by the dependencies it
 * declares (a subnet in its network, a VM in its subnet), and the agents never
 * fall back to a network of their own choosing. Internal.
 */
import type {ComponentValidator} from './component_validator';
import {dependenciesOfType, refuseComponent} from './cross_component_rules';

/** The prefix length of the /24 the agents carve a subnet without a range from. */
const CARVED_PREFIX = 24;

const cidrPrefix = (cidr: string): number | undefined => {
  const match = /^\d{1,3}(?:\.\d{1,3}){3}\/(\d{1,2})$/.exec(cidr.trim());
  return match === null ? undefined : Number(match[1]);
};

/**
 * A subnet without a `cidrBlock` is given the next /24 of its network's block:
 * its position among the subnets of the same type on that network, ordered by
 * id. The agent refuses it when the network declares no block to carve from, or
 * when that position falls outside the block.
 */
export const subnetRangeIsCarvable =
  (networkTypes: readonly string[]): ComponentValidator =>
  (self, all) => {
    const own = self.parameters.cidrBlock;
    if (typeof own === 'string' && own.trim() !== '') {
      return;
    }
    const [network] = dependenciesOfType(self, all, networkTypes);
    // A missing network is the dependency rule's to report; a referenced one's
    // block belongs to the Live System that owns it.
    if (network === undefined || network.reference !== undefined) {
      return;
    }
    const block = network.parameters.cidrBlock;
    if (typeof block !== 'string' || block.trim() === '') {
      refuseComponent(
        self,
        `declares no 'cidrBlock' and its network '${network.id}' has no address block to ` +
          "carve one from. Declare 'cidrBlock' on the subnet, or on the network when it has " +
          'an address space of its own',
      );
    }
    const prefix = cidrPrefix(block as string);
    if (prefix === undefined) {
      return;
    }
    if (prefix > CARVED_PREFIX) {
      refuseComponent(
        self,
        `declares no 'cidrBlock', and the /${CARVED_PREFIX} the agent would carve for it does ` +
          `not fit in its network's block ${block}. Declare 'cidrBlock' on the subnet`,
      );
    }
    const siblings = all
      .filter(c => c.type === self.type && c.dependencies.includes(network.id))
      .map(c => c.id)
      .sort();
    const index = siblings.indexOf(self.id);
    if (index >= 2 ** (CARVED_PREFIX - prefix)) {
      refuseComponent(
        self,
        `declares no 'cidrBlock', and as subnet ${index + 1} of network '${network.id}' its ` +
          `carved /${CARVED_PREFIX} falls outside the network's block ${block}. Declare ` +
          "'cidrBlock' on the subnet",
      );
    }
  };

/** The region of a GCP zone (`europe-west1-b` → `europe-west1`). */
const zoneRegion = (zone: string): string => zone.replace(/-[a-z]$/, '');

/**
 * A GCP VM is created in its subnet's region: the agent refuses a VM whose
 * `region`, or whose `zone`'s region, is another region than its subnet's.
 * Checked when both regions are declared.
 */
export const gcpVmInSubnetRegion =
  (subnetType: string): ComponentValidator =>
  (self, all) => {
    const [subnet] = dependenciesOfType(self, all, [subnetType]);
    const subnetRegion = subnet?.parameters.region;
    if (typeof subnetRegion !== 'string' || subnetRegion.trim() === '') {
      return;
    }
    const region = self.parameters.region;
    if (
      typeof region === 'string' &&
      region.trim() !== '' &&
      region !== subnetRegion
    ) {
      refuseComponent(
        self,
        `declares region '${region}', but its subnet '${subnet!.id}' is in region ` +
          `'${subnetRegion}': a VM is created in its subnet's region. Drop the VM's region, ` +
          'or depend on a subnet of that region',
      );
    }
    const zone = self.parameters.zone;
    if (
      typeof zone === 'string' &&
      zone.trim() !== '' &&
      zoneRegion(zone) !== subnetRegion
    ) {
      refuseComponent(
        self,
        `declares zone '${zone}' (region '${zoneRegion(zone)}'), but its subnet ` +
          `'${subnet!.id}' is in region '${subnetRegion}'. Choose a zone of '${subnetRegion}'`,
      );
    }
  };
