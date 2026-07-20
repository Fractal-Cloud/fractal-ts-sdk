/**
 * offers/network_and_compute.ts — NetworkAndCompute Offer catalogue (Level 3).
 *
 * Each offer declares which abstract Component it satisfies, its 3-part offer
 * type, its vendor (provider) and delivery model, and carries vendor knobs in
 * its config type. Offers with no extra vendor knobs use config type `{}`.
 */
import {defineOffer} from '../core';

// ── VirtualNetwork ───────────────────────────────────────────────────────────
export const AwsVpc = defineOffer<'NetworkAndCompute.VirtualNetwork', {}>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.AwsVpc',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureVnet = defineOffer<'NetworkAndCompute.VirtualNetwork', {}>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.AzureVnet',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpVpc = defineOffer<'NetworkAndCompute.VirtualNetwork', {}>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.GcpVpc',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── Subnet ───────────────────────────────────────────────────────────────────
export const AwsSubnet = defineOffer<'NetworkAndCompute.Subnet', {}>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.AwsSubnet',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureSubnet = defineOffer<'NetworkAndCompute.Subnet', {}>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.AzureSubnet',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpSubnet = defineOffer<'NetworkAndCompute.Subnet', {}>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.GcpSubnet',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── SecurityGroup ────────────────────────────────────────────────────────────
export const AwsSecurityGroup = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.AwsSecurityGroup',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureNsg = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {location: string; resourceGroup: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.AzureNsg',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpFirewall = defineOffer<'NetworkAndCompute.SecurityGroup', {}>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.GcpFirewall',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── VirtualMachine ───────────────────────────────────────────────────────────
export const Ec2Instance = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {amiId: string; instanceType: string; userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.AwsEc2Instance',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {vmSize: string; userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.AzureVm',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {machineType: string; userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.GcpVm',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});
export const VsphereVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {template: string; userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.VsphereVm',
  provider: 'VMware',
  deliveryModel: 'IaaS',
});
export const OpenshiftVm = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.CaaS.OpenshiftVm',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});

// ── ContainerPlatform ────────────────────────────────────────────────────────
export const Eks = defineOffer<'NetworkAndCompute.ContainerPlatform', {}>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: 'NetworkAndCompute.PaaS.AwsEks',
  provider: 'AWS',
  deliveryModel: 'PaaS',
});
export const Aks = defineOffer<'NetworkAndCompute.ContainerPlatform', {}>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: 'NetworkAndCompute.PaaS.AzureAks',
  provider: 'Azure',
  deliveryModel: 'PaaS',
});
export const Gke = defineOffer<'NetworkAndCompute.ContainerPlatform', {}>({
  satisfies: 'NetworkAndCompute.ContainerPlatform',
  offerType: 'NetworkAndCompute.PaaS.GcpGke',
  provider: 'GCP',
  deliveryModel: 'PaaS',
});

// ── LoadBalancer ─────────────────────────────────────────────────────────────
export const AwsLb = defineOffer<'NetworkAndCompute.LoadBalancer', {}>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.IaaS.AwsLb',
  provider: 'AWS',
  deliveryModel: 'IaaS',
});
export const AzureLb = defineOffer<'NetworkAndCompute.LoadBalancer', {}>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.IaaS.AzureLb',
  provider: 'Azure',
  deliveryModel: 'IaaS',
});
export const GcpGlb = defineOffer<'NetworkAndCompute.LoadBalancer', {}>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.IaaS.GcpGlb',
  provider: 'GCP',
  deliveryModel: 'IaaS',
});

// ── OCI ──────────────────────────────────────────────────────────────────────
export const OciVcn = defineOffer<'NetworkAndCompute.VirtualNetwork', {}>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.OciVcn',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {availabilityDomain?: string}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.OciSubnet',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciSecurityList = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {compartmentId: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.OciSecurityList',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});
export const OciInstance = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {shape: string; userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.OciInstance',
  provider: 'OCI',
  deliveryModel: 'IaaS',
});

// ── Hetzner ──────────────────────────────────────────────────────────────────
export const HetznerNetwork = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.HetznerNetwork',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});
export const HetznerSubnet = defineOffer<
  'NetworkAndCompute.Subnet',
  {networkZone?: string}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.HetznerSubnet',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});
export const HetznerFirewall = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.IaaS.HetznerFirewall',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});
export const HetznerServer = defineOffer<
  'NetworkAndCompute.VirtualMachine',
  {serverType: string; userData?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualMachine',
  offerType: 'NetworkAndCompute.IaaS.HetznerServer',
  provider: 'Hetzner',
  deliveryModel: 'IaaS',
});

// ── VMware (vSphere) ─────────────────────────────────────────────────────────
export const VspherePortGroup = defineOffer<
  'NetworkAndCompute.VirtualNetwork',
  {dvSwitchName?: string}
>({
  satisfies: 'NetworkAndCompute.VirtualNetwork',
  offerType: 'NetworkAndCompute.IaaS.VspherePortGroup',
  provider: 'VMware',
  deliveryModel: 'IaaS',
});
export const VsphereVlan = defineOffer<
  'NetworkAndCompute.Subnet',
  {vlanId?: number}
>({
  satisfies: 'NetworkAndCompute.Subnet',
  offerType: 'NetworkAndCompute.IaaS.VsphereVlan',
  provider: 'VMware',
  deliveryModel: 'IaaS',
});

// ── OpenShift (RedHat, CaaS) ─────────────────────────────────────────────────
export const OpenshiftSecurityGroup = defineOffer<
  'NetworkAndCompute.SecurityGroup',
  {name?: string}
>({
  satisfies: 'NetworkAndCompute.SecurityGroup',
  offerType: 'NetworkAndCompute.CaaS.OpenshiftNetworkPolicy',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});
export const OpenshiftService = defineOffer<
  'NetworkAndCompute.LoadBalancer',
  {}
>({
  satisfies: 'NetworkAndCompute.LoadBalancer',
  offerType: 'NetworkAndCompute.CaaS.OpenshiftService',
  provider: 'RedHat',
  deliveryModel: 'CaaS',
});
