/**
 * components/network_and_compute.ts — NetworkAndCompute Component factories.
 *
 * Each agnostic blueprint parameter is a typed `.withXxx()` guardrail setter
 * (locked at design time). Components that can sit under another expose
 * `dependsOn(other)` to declare a structural dependency. Vendor knobs do NOT
 * live here — they belong on Offers (see offers/network_and_compute.ts).
 */
import {
  ComponentNode,
  NodeState,
  AnyNode,
  newNode,
  guardrail,
  addDependency,
} from '../core';

// ── Shared value types ───────────────────────────────────────────────────────
export type Rule = {
  protocol?: string;
  fromPort: number;
  toPort?: number;
  sourceCidr?: string;
};
export type NodePool = {
  name: string;
  minNodeCount?: number;
  maxNodeCount?: number;
  autoscalingEnabled?: boolean;
};

// ── VirtualNetwork ───────────────────────────────────────────────────────────
export type VirtualNetworkNode<Id extends string = string> = ComponentNode<
  Id,
  'NetworkAndCompute.VirtualNetwork'
> & {
  withCidrBlock: (v: string) => VirtualNetworkNode<Id>;
  withRegion: (v: string) => VirtualNetworkNode<Id>;
  withTags: (v: Record<string, string>) => VirtualNetworkNode<Id>;
};
const virtualNetworkNode = <Id extends string>(
  s: NodeState,
): VirtualNetworkNode<Id> => ({
  state: s,
  withCidrBlock: v => virtualNetworkNode<Id>(guardrail(s, 'cidrBlock', v)),
  withRegion: v => virtualNetworkNode<Id>(guardrail(s, 'region', v)),
  withTags: v => virtualNetworkNode<Id>(guardrail(s, 'tags', v)),
});
export const VirtualNetwork = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): VirtualNetworkNode<Id> =>
  virtualNetworkNode<Id>(
    newNode(cfg.id, 'NetworkAndCompute.VirtualNetwork', cfg.displayName),
  );

// ── Subnet ───────────────────────────────────────────────────────────────────
export type SubnetNode<Id extends string = string> = ComponentNode<
  Id,
  'NetworkAndCompute.Subnet'
> & {
  withCidrBlock: (v: string) => SubnetNode<Id>;
  dependsOn: (other: AnyNode) => SubnetNode<Id>;
};
const subnetNode = <Id extends string>(s: NodeState): SubnetNode<Id> => ({
  state: s,
  withCidrBlock: v => subnetNode<Id>(guardrail(s, 'cidrBlock', v)),
  dependsOn: other => subnetNode<Id>(addDependency(s, other.state.id)),
});
export const Subnet = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): SubnetNode<Id> =>
  subnetNode<Id>(newNode(cfg.id, 'NetworkAndCompute.Subnet', cfg.displayName));

// ── SecurityGroup ────────────────────────────────────────────────────────────
export type SecurityGroupNode<Id extends string = string> = ComponentNode<
  Id,
  'NetworkAndCompute.SecurityGroup'
> & {
  withIngressRules: (v: Rule[]) => SecurityGroupNode<Id>;
  withEgressRules: (v: Rule[]) => SecurityGroupNode<Id>;
  dependsOn: (other: AnyNode) => SecurityGroupNode<Id>;
};
const securityGroupNode = <Id extends string>(
  s: NodeState,
): SecurityGroupNode<Id> => ({
  state: s,
  withIngressRules: v => securityGroupNode<Id>(guardrail(s, 'ingressRules', v)),
  withEgressRules: v => securityGroupNode<Id>(guardrail(s, 'egressRules', v)),
  dependsOn: other => securityGroupNode<Id>(addDependency(s, other.state.id)),
});
export const SecurityGroup = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): SecurityGroupNode<Id> =>
  securityGroupNode<Id>(
    newNode(cfg.id, 'NetworkAndCompute.SecurityGroup', cfg.displayName),
  );

// ── VirtualMachine ───────────────────────────────────────────────────────────
export type VirtualMachineNode<Id extends string = string> = ComponentNode<
  Id,
  'NetworkAndCompute.VirtualMachine'
> & {
  withOsType: (v: 'linux' | 'windows') => VirtualMachineNode<Id>;
  withSize: (v: string) => VirtualMachineNode<Id>;
  withTags: (v: Record<string, string>) => VirtualMachineNode<Id>;
  dependsOn: (other: AnyNode) => VirtualMachineNode<Id>;
};
const virtualMachineNode = <Id extends string>(
  s: NodeState,
): VirtualMachineNode<Id> => ({
  state: s,
  withOsType: v => virtualMachineNode<Id>(guardrail(s, 'osType', v)),
  withSize: v => virtualMachineNode<Id>(guardrail(s, 'size', v)),
  withTags: v => virtualMachineNode<Id>(guardrail(s, 'tags', v)),
  dependsOn: other => virtualMachineNode<Id>(addDependency(s, other.state.id)),
});
export const VirtualMachine = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): VirtualMachineNode<Id> =>
  virtualMachineNode<Id>(
    newNode(cfg.id, 'NetworkAndCompute.VirtualMachine', cfg.displayName),
  );

// ── ContainerPlatform ────────────────────────────────────────────────────────
export type ContainerPlatformNode<Id extends string = string> = ComponentNode<
  Id,
  'NetworkAndCompute.ContainerPlatform'
> & {
  withNodePools: (v: NodePool[]) => ContainerPlatformNode<Id>;
  withKubernetesVersion: (v: string) => ContainerPlatformNode<Id>;
  withNetworkPolicyProvider: (v: string) => ContainerPlatformNode<Id>;
  dependsOn: (other: AnyNode) => ContainerPlatformNode<Id>;
};
const containerPlatformNode = <Id extends string>(
  s: NodeState,
): ContainerPlatformNode<Id> => ({
  state: s,
  withNodePools: v => containerPlatformNode<Id>(guardrail(s, 'nodePools', v)),
  withKubernetesVersion: v =>
    containerPlatformNode<Id>(guardrail(s, 'kubernetesVersion', v)),
  withNetworkPolicyProvider: v =>
    containerPlatformNode<Id>(guardrail(s, 'networkPolicyProvider', v)),
  dependsOn: other =>
    containerPlatformNode<Id>(addDependency(s, other.state.id)),
});
export const ContainerPlatform = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): ContainerPlatformNode<Id> =>
  containerPlatformNode<Id>(
    newNode(cfg.id, 'NetworkAndCompute.ContainerPlatform', cfg.displayName),
  );

// ── LoadBalancer ─────────────────────────────────────────────────────────────
export type LoadBalancerNode<Id extends string = string> = ComponentNode<
  Id,
  'NetworkAndCompute.LoadBalancer'
> & {
  withScheme: (v: 'internal' | 'internet-facing') => LoadBalancerNode<Id>;
  dependsOn: (other: AnyNode) => LoadBalancerNode<Id>;
};
const loadBalancerNode = <Id extends string>(
  s: NodeState,
): LoadBalancerNode<Id> => ({
  state: s,
  withScheme: v => loadBalancerNode<Id>(guardrail(s, 'scheme', v)),
  dependsOn: other => loadBalancerNode<Id>(addDependency(s, other.state.id)),
});
export const LoadBalancer = <const Id extends string>(cfg: {
  id: Id;
  displayName?: string;
}): LoadBalancerNode<Id> =>
  loadBalancerNode<Id>(
    newNode(cfg.id, 'NetworkAndCompute.LoadBalancer', cfg.displayName),
  );
