/**
 * components/block_volume.ts — Storage.BlockVolume (Level 1).
 *
 * A block storage volume (the catalog's `Storage.IaaS.BlockVolume`), e.g. one a
 * virtual machine attaches. Its size is a guardrail; its volume type and zone
 * are the selected offer's config.
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  guardrail,
  addDependency,
} from '../core';

export type BlockVolumeNode<Id extends string = string> = ComponentNode<
  Id,
  'Storage.BlockVolume'
> & {
  /** The volume's size in GiB. */
  withSizeGb: (v: number) => BlockVolumeNode<Id>;
  /** Declare a structural dependency, e.g. on the machine that attaches it. */
  dependsOn: (other: AnyNode) => BlockVolumeNode<Id>;
};
const blockVolumeNode = <Id extends string>(
  s: NodeState,
): BlockVolumeNode<Id> => ({
  state: s,
  withSizeGb: v => blockVolumeNode<Id>(guardrail(s, 'sizeGb', v)),
  dependsOn: other => blockVolumeNode<Id>(addDependency(s, other.state.id)),
});
export const BlockVolume = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): BlockVolumeNode<Id> =>
  blockVolumeNode<Id>(newNode(cfg.id, 'Storage.BlockVolume', cfg.displayName));
