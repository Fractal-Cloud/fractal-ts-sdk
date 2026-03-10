import * as FractalInternal from './fractal';
import * as BoundedContextInternal from './bounded_context';
import * as InfrastructureDomainInternal from './values/infrastructure_domain';
import * as KebabCaseStringInternal from './values/kebab_case_string';
import * as OwnerIdInternal from './values/owner_id';
import * as OwnerTypeInternal from './values/owner_type';
import * as PascalCaseStringInternal from './values/pascal_case_string';
import * as ServiceAccountCredentialsInternal from './values/service_account_credentials';
import * as ServiceAccountIdInternal from './values/service_account_id';
import * as ServiceDeliveryModelInternal from './values/service_delivery_model';
import * as VersionInternal from './values/version';
import * as EnvironmentInternal from './environment';
import * as LiveSystemInternal from './live_system';

export const BoundedContext = BoundedContextInternal.BoundedContext;
export type BoundedContext = BoundedContextInternal.BoundedContext;

export const Fractal = FractalInternal.Fractal;
export type Fractal = FractalInternal.Fractal;

export const InfrastructureDomain =
  InfrastructureDomainInternal.InfrastructureDomain;
export type InfrastructureDomain =
  InfrastructureDomainInternal.InfrastructureDomain;

export const KebabCaseString = KebabCaseStringInternal.KebabCaseString;
export type KebabCaseString = KebabCaseStringInternal.KebabCaseString;

export const OwnerId = OwnerIdInternal.OwnerId;
export type OwnerId = OwnerIdInternal.OwnerId;

export const OwnerType = OwnerTypeInternal.OwnerType;
export type OwnerType = OwnerTypeInternal.OwnerType;

export const PascalCaseString = PascalCaseStringInternal.PascalCaseString;
export type PascalCaseString = PascalCaseStringInternal.PascalCaseString;

export const ServiceAccountCredentials =
  ServiceAccountCredentialsInternal.ServiceAccountCredentials;
export type ServiceAccountCredentials =
  ServiceAccountCredentialsInternal.ServiceAccountCredentials;

export const ServiceAccountId = ServiceAccountIdInternal.ServiceAccountId;
export type ServiceAccountId = ServiceAccountIdInternal.ServiceAccountId;

export const ServiceDeliveryModel =
  ServiceDeliveryModelInternal.ServiceDeliveryModel;
export type ServiceDeliveryModel =
  ServiceDeliveryModelInternal.ServiceDeliveryModel;

export const Version = VersionInternal.Version;
export type Version = VersionInternal.Version;

export const Environment = EnvironmentInternal.Environment;
export type Environment = EnvironmentInternal.Environment;

export const LiveSystem = LiveSystemInternal.LiveSystem;
export type LiveSystem = LiveSystemInternal.LiveSystem;

// Blueprint component helpers (cloud-agnostic)
export {VirtualNetwork} from './fractal/component/network_and_compute/iaas/virtual_network';
export type {
  VirtualNetworkBuilder,
  VirtualNetworkConfig,
  VirtualNetworkComponent,
  VirtualNetworkResult,
} from './fractal/component/network_and_compute/iaas/virtual_network';

export {Subnet} from './fractal/component/network_and_compute/iaas/subnet';
export type {
  SubnetBuilder,
  SubnetConfig,
  SubnetComponent,
  SubnetResult,
} from './fractal/component/network_and_compute/iaas/subnet';

export {SecurityGroup} from './fractal/component/network_and_compute/iaas/security_group';
export type {
  SecurityGroupBuilder,
  SecurityGroupConfig,
  SecurityGroupComponent,
  IngressRule,
} from './fractal/component/network_and_compute/iaas/security_group';

export {VirtualMachine} from './fractal/component/network_and_compute/iaas/vm';
export type {
  VirtualMachineBuilder,
  VirtualMachineConfig,
  VirtualMachineComponent,
  VmPortLink,
} from './fractal/component/network_and_compute/iaas/vm';

// Live system component helpers — AWS IaaS
export {AwsVpc} from './live_system/component/network_and_compute/iaas/vpc';
export type {
  AwsVpcBuilder,
  AwsVpcConfig,
  SatisfiedAwsVpcBuilder,
} from './live_system/component/network_and_compute/iaas/vpc';

export {AwsSubnet} from './live_system/component/network_and_compute/iaas/subnet';
export type {
  AwsSubnetBuilder,
  AwsSubnetConfig,
  SatisfiedAwsSubnetBuilder,
} from './live_system/component/network_and_compute/iaas/subnet';

export {AwsSecurityGroup} from './live_system/component/network_and_compute/iaas/security_group';
export type {
  AwsSecurityGroupBuilder,
  AwsSecurityGroupConfig,
  SatisfiedAwsSecurityGroupBuilder,
} from './live_system/component/network_and_compute/iaas/security_group';

export {Ec2Instance} from './live_system/component/network_and_compute/iaas/ec2_instance';
export type {
  Ec2InstanceBuilder,
  Ec2InstanceConfig,
  SatisfiedEc2Builder,
} from './live_system/component/network_and_compute/iaas/ec2_instance';

// Live system component helpers — Azure IaaS
export {AzureVnet} from './live_system/component/network_and_compute/iaas/azure_vnet';
export type {
  AzureVnetBuilder,
  AzureVnetConfig,
  SatisfiedAzureVnetBuilder,
} from './live_system/component/network_and_compute/iaas/azure_vnet';

export {AzureSubnet} from './live_system/component/network_and_compute/iaas/azure_subnet';
export type {
  AzureSubnetBuilder,
  AzureSubnetConfig,
  SatisfiedAzureSubnetBuilder,
} from './live_system/component/network_and_compute/iaas/azure_subnet';

export {AzureNsg} from './live_system/component/network_and_compute/iaas/azure_nsg';
export type {
  AzureNsgBuilder,
  AzureNsgConfig,
  SatisfiedAzureNsgBuilder,
} from './live_system/component/network_and_compute/iaas/azure_nsg';

export {AzureVm} from './live_system/component/network_and_compute/iaas/azure_vm';
export type {
  AzureVmBuilder,
  AzureVmConfig,
  SatisfiedAzureVmBuilder,
} from './live_system/component/network_and_compute/iaas/azure_vm';

// Live system component helpers — GCP IaaS
export {GcpVpc} from './live_system/component/network_and_compute/iaas/gcp_vpc';
export type {
  GcpVpcBuilder,
  GcpVpcConfig,
  SatisfiedGcpVpcBuilder,
} from './live_system/component/network_and_compute/iaas/gcp_vpc';

export {GcpSubnet} from './live_system/component/network_and_compute/iaas/gcp_subnet';
export type {
  GcpSubnetBuilder,
  GcpSubnetConfig,
  SatisfiedGcpSubnetBuilder,
} from './live_system/component/network_and_compute/iaas/gcp_subnet';

export {GcpFirewall} from './live_system/component/network_and_compute/iaas/gcp_firewall';
export type {
  GcpFirewallBuilder,
  GcpFirewallConfig,
  SatisfiedGcpFirewallBuilder,
} from './live_system/component/network_and_compute/iaas/gcp_firewall';

export {GcpVm} from './live_system/component/network_and_compute/iaas/gcp_vm';
export type {
  GcpVmBuilder,
  GcpVmConfig,
  SatisfiedGcpVmBuilder,
} from './live_system/component/network_and_compute/iaas/gcp_vm';

// Live system component helpers — OCI IaaS
export {OciVcn} from './live_system/component/network_and_compute/iaas/oci_vcn';
export type {
  OciVcnBuilder,
  OciVcnConfig,
  SatisfiedOciVcnBuilder,
} from './live_system/component/network_and_compute/iaas/oci_vcn';

export {OciSubnet} from './live_system/component/network_and_compute/iaas/oci_subnet';
export type {
  OciSubnetBuilder,
  OciSubnetConfig,
  SatisfiedOciSubnetBuilder,
} from './live_system/component/network_and_compute/iaas/oci_subnet';

export {OciSecurityList} from './live_system/component/network_and_compute/iaas/oci_security_list';
export type {
  OciSecurityListBuilder,
  OciSecurityListConfig,
  SatisfiedOciSecurityListBuilder,
} from './live_system/component/network_and_compute/iaas/oci_security_list';

export {OciInstance} from './live_system/component/network_and_compute/iaas/oci_instance';
export type {
  OciInstanceBuilder,
  OciInstanceConfig,
  SatisfiedOciInstanceBuilder,
} from './live_system/component/network_and_compute/iaas/oci_instance';

// Live system component helpers — Hetzner IaaS
export {HetznerNetwork} from './live_system/component/network_and_compute/iaas/hetzner_network';
export type {
  HetznerNetworkBuilder,
  HetznerNetworkConfig,
  SatisfiedHetznerNetworkBuilder,
} from './live_system/component/network_and_compute/iaas/hetzner_network';

export {HetznerSubnet} from './live_system/component/network_and_compute/iaas/hetzner_subnet';
export type {
  HetznerSubnetBuilder,
  HetznerSubnetConfig,
  SatisfiedHetznerSubnetBuilder,
} from './live_system/component/network_and_compute/iaas/hetzner_subnet';

export {HetznerFirewall} from './live_system/component/network_and_compute/iaas/hetzner_firewall';
export type {
  HetznerFirewallBuilder,
  HetznerFirewallConfig,
  SatisfiedHetznerFirewallBuilder,
} from './live_system/component/network_and_compute/iaas/hetzner_firewall';

export {HetznerServer} from './live_system/component/network_and_compute/iaas/hetzner_server';
export type {
  HetznerServerBuilder,
  HetznerServerConfig,
  SatisfiedHetznerServerBuilder,
} from './live_system/component/network_and_compute/iaas/hetzner_server';

// Blueprint component helpers — PaaS
export {ContainerPlatform} from './fractal/component/network_and_compute/paas/container_platform';
export type {
  ContainerPlatformBuilder,
  ContainerPlatformConfig,
  ContainerPlatformComponent,
} from './fractal/component/network_and_compute/paas/container_platform';

// Blueprint component helpers — CaaS
export {Workload} from './fractal/component/custom_workloads/caas/workload';
export type {
  WorkloadBuilder,
  WorkloadConfig,
  WorkloadComponent,
  WorkloadPortLink,
} from './fractal/component/custom_workloads/caas/workload';

// Live system component helpers — AWS PaaS
export {AwsEcsCluster} from './live_system/component/network_and_compute/paas/ecs_cluster';
export type {
  AwsEcsClusterBuilder,
  AwsEcsClusterConfig,
  SatisfiedAwsEcsClusterBuilder,
} from './live_system/component/network_and_compute/paas/ecs_cluster';

export {AwsEcsTaskDefinition} from './live_system/component/network_and_compute/paas/ecs_task_definition';
export type {
  AwsEcsTaskDefinitionBuilder,
  AwsEcsTaskDefinitionConfig,
  SatisfiedAwsEcsTaskDefinitionBuilder,
} from './live_system/component/network_and_compute/paas/ecs_task_definition';

export {AwsEcsService} from './live_system/component/network_and_compute/paas/ecs_service';
export type {
  AwsEcsServiceBuilder,
  AwsEcsServiceConfig,
  SatisfiedAwsEcsServiceBuilder,
} from './live_system/component/network_and_compute/paas/ecs_service';
