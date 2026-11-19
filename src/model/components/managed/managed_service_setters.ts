/**
 * The guardrails every managed-service component shares: its high-availability
 * layout, backup policy, maintenance window and version line. Each is a
 * guardrail (locked at design time); the selected offer translates it for its
 * agent, or refuses the Live System, naming why (docs/offer-contracts.md §3.1).
 */
import {NodeState, guardrail} from '../../core';
import type {HaLayout} from './ha_layout';
import type {BackupPolicy} from './backup_policy';
import type {MaintenanceWindow} from './maintenance_window';

// An interface, not a type alias: a node type intersects it with itself as
// `N` (`XNode = ComponentNode<...> & ManagedServiceSetters<XNode> & {...}`),
// which a type alias cannot express (it would reference itself eagerly).
export interface ManagedServiceSetters<N> {
  /** How many replicas the service keeps, and whether they span zones. */
  withHaLayout: (v: HaLayout) => N;
  /** When backups of the service's data are taken, and how long they are kept. */
  withBackupPolicy: (v: BackupPolicy) => N;
  /** When upgrades of the service may run. */
  withMaintenanceWindow: (v: MaintenanceWindow) => N;
  /**
   * The version line the service follows (e.g. `9.1`, `4.3`): upgrades stay on
   * it; a patch release inside the line is the agent's to apply.
   */
  withVersionLine: (v: string) => N;
}

/** The managed-service setters of a component, building its node with `node`. */
export const managedServiceSetters = <N>(
  s: NodeState,
  node: (next: NodeState) => N,
): ManagedServiceSetters<N> => ({
  withHaLayout: v => node(guardrail(s, 'haLayout', v)),
  withBackupPolicy: v => node(guardrail(s, 'backupPolicy', v)),
  withMaintenanceWindow: v => node(guardrail(s, 'maintenanceWindow', v)),
  withVersionLine: v => node(guardrail(s, 'versionLine', v)),
});
