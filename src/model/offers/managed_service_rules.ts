/**
 * offers/managed_service_rules.ts — the rules an offer gives the
 * managed-service settings (`withHaLayout`, `withBackupPolicy`,
 * `withMaintenanceWindow`, `withVersionLine`; see ManagedServiceSetters) when
 * its agent's contract publishes no key for them.
 */
import type {NeutralRule} from '../neutral_rule';
import type {OfferContract} from './contract/offer_contract';
import type {HaLayout} from '../components/managed/ha_layout';
import {toContractKey, unsupported} from './neutral_rules';

/** Every managed-service setting refused: the agent publishes none of them. */
export const noManagedServiceSettings: Readonly<Record<string, NeutralRule>> = {
  haLayout: unsupported('the agent publishes no high-availability layout'),
  backupPolicy: unsupported('the agent publishes no backup policy'),
  maintenanceWindow: unsupported('the agent publishes no maintenance window'),
  versionLine: unsupported('the agent publishes no version line'),
};

/**
 * `withHaLayout` for an agent that publishes only a replica count, `key`: the
 * layout's `replicas` becomes it. Fewer than one replica is refused: no
 * service runs on none. Spreading over zones is refused unless the agent
 * promises it (`spreadsZones`), since nothing tells the agent to. Whether the
 * value is an integer is the contract's to check.
 */
export const haLayoutToReplicas = <
  C extends OfferContract,
  K extends keyof C['params'] & string,
>(
  contract: C,
  key: K,
  spreadsZones: boolean,
): NeutralRule =>
  toContractKey(contract, key, value => {
    const layout = value as HaLayout;
    if (typeof layout.replicas === 'number' && layout.replicas < 1) {
      throw new Error(
        `replicas ${layout.replicas} is below 1: a service needs at least one replica`,
      );
    }
    if (layout.spreadZones === true && !spreadsZones) {
      throw new Error(
        'the agent does not promise to spread the replicas over zones',
      );
    }
    return layout.replicas;
  });
