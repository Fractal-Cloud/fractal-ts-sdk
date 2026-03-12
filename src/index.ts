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
export {AwsEksCluster} from './live_system/component/network_and_compute/paas/eks_cluster';
export type {
  AwsEksClusterBuilder,
  AwsEksClusterConfig,
  SatisfiedAwsEksClusterBuilder,
} from './live_system/component/network_and_compute/paas/eks_cluster';

export {AwsEcsCluster} from './live_system/component/network_and_compute/paas/ecs_cluster';
export type {
  AwsEcsClusterBuilder,
  AwsEcsClusterConfig,
  SatisfiedAwsEcsClusterBuilder,
} from './live_system/component/network_and_compute/paas/ecs_cluster';

export {AwsEcsTaskDefinition} from './live_system/component/network_and_compute/paas/ecs_task_definition';
export type {
  AwsEcsTaskDefinitionBuilder,
  AwsEcsTaskDefinitionComponent,
  AwsEcsTaskDefinitionConfig,
  SatisfiedAwsEcsTaskDefinitionBuilder,
} from './live_system/component/network_and_compute/paas/ecs_task_definition';

export {AwsEcsService} from './live_system/component/network_and_compute/paas/ecs_service';
export type {
  AwsEcsServiceBuilder,
  AwsEcsServiceConfig,
  SatisfiedAwsEcsServiceBuilder,
} from './live_system/component/network_and_compute/paas/ecs_service';

// Live system component helpers — Azure PaaS
export {AzureAksCluster} from './live_system/component/network_and_compute/paas/azure_aks';
export type {
  AzureAksClusterBuilder,
  AzureAksClusterConfig,
  SatisfiedAzureAksClusterBuilder,
} from './live_system/component/network_and_compute/paas/azure_aks';

export {AzureContainerAppsEnvironment} from './live_system/component/network_and_compute/paas/azure_container_apps_environment';
export type {
  AzureContainerAppsEnvironmentBuilder,
  AzureContainerAppsEnvironmentConfig,
  SatisfiedAzureContainerAppsEnvironmentBuilder,
} from './live_system/component/network_and_compute/paas/azure_container_apps_environment';

export {AzureContainerInstance} from './live_system/component/network_and_compute/paas/azure_container_instance';
export type {
  AzureContainerInstanceBuilder,
  AzureContainerInstanceConfig,
  SatisfiedAzureContainerInstanceBuilder,
} from './live_system/component/network_and_compute/paas/azure_container_instance';

export {AzureContainerApp} from './live_system/component/network_and_compute/paas/azure_container_app';
export type {
  AzureContainerAppBuilder,
  AzureContainerAppConfig,
  SatisfiedAzureContainerAppBuilder,
} from './live_system/component/network_and_compute/paas/azure_container_app';

// Live system component helpers — GCP PaaS
export {GcpGkeCluster} from './live_system/component/network_and_compute/paas/gcp_gke';
export type {
  GcpGkeClusterBuilder,
  GcpGkeClusterConfig,
  SatisfiedGcpGkeClusterBuilder,
} from './live_system/component/network_and_compute/paas/gcp_gke';

export {GcpCloudRunService} from './live_system/component/network_and_compute/paas/gcp_cloud_run_service';
export type {
  GcpCloudRunServiceBuilder,
  GcpCloudRunServiceConfig,
  SatisfiedGcpCloudRunServiceBuilder,
} from './live_system/component/network_and_compute/paas/gcp_cloud_run_service';

// Live system component helpers — OCI PaaS
export {OciContainerInstance} from './live_system/component/network_and_compute/paas/oci_container_instance';
export type {
  OciContainerInstanceBuilder,
  OciContainerInstanceConfig,
  SatisfiedOciContainerInstanceBuilder,
} from './live_system/component/network_and_compute/paas/oci_container_instance';

// ── Storage domain — Blueprint component helpers ─────────────────────────────

// Storage PaaS — Leaf nodes
export {FilesAndBlobs} from './fractal/component/storage/paas/files_and_blobs';
export type {
  FilesAndBlobsBuilder,
  FilesAndBlobsConfig,
  FilesAndBlobsComponent,
} from './fractal/component/storage/paas/files_and_blobs';

export {RelationalDatabase} from './fractal/component/storage/paas/relational_database';
export type {
  RelationalDatabaseBuilder,
  RelationalDatabaseConfig,
  RelationalDatabaseComponent,
} from './fractal/component/storage/paas/relational_database';

export {DocumentDatabase} from './fractal/component/storage/paas/document_database';
export type {
  DocumentDatabaseBuilder,
  DocumentDatabaseConfig,
  DocumentDatabaseComponent,
} from './fractal/component/storage/paas/document_database';

export {ColumnOrientedEntity} from './fractal/component/storage/paas/column_oriented_entity';
export type {
  ColumnOrientedEntityBuilder,
  ColumnOrientedEntityConfig,
  ColumnOrientedEntityComponent,
} from './fractal/component/storage/paas/column_oriented_entity';

export {KeyValueEntity} from './fractal/component/storage/paas/key_value_entity';
export type {
  KeyValueEntityBuilder,
  KeyValueEntityConfig,
  KeyValueEntityComponent,
} from './fractal/component/storage/paas/key_value_entity';

export {GraphDatabase} from './fractal/component/storage/paas/graph_database';
export type {
  GraphDatabaseBuilder,
  GraphDatabaseConfig,
  GraphDatabaseComponent,
} from './fractal/component/storage/paas/graph_database';

// Storage CaaS — Leaf nodes
export {SearchEntity} from './fractal/component/storage/caas/search_entity';
export type {
  SearchEntityBuilder,
  SearchEntityConfig,
  SearchEntityComponent,
} from './fractal/component/storage/caas/search_entity';

// Storage SaaS — Leaf nodes
export {Unmanaged} from './fractal/component/storage/saas/unmanaged';
export type {
  UnmanagedBuilder,
  UnmanagedConfig,
  UnmanagedComponent,
} from './fractal/component/storage/saas/unmanaged';

// Storage PaaS — Container nodes
export {RelationalDbms} from './fractal/component/storage/paas/relational_dbms';
export type {
  RelationalDbmsBuilder,
  RelationalDbmsConfig,
  RelationalDbmsComponent,
} from './fractal/component/storage/paas/relational_dbms';

export {DocumentDbms} from './fractal/component/storage/paas/document_dbms';
export type {
  DocumentDbmsBuilder,
  DocumentDbmsConfig,
  DocumentDbmsComponent,
} from './fractal/component/storage/paas/document_dbms';

export {ColumnOrientedDbms} from './fractal/component/storage/paas/column_oriented_dbms';
export type {
  ColumnOrientedDbmsBuilder,
  ColumnOrientedDbmsConfig,
  ColumnOrientedDbmsComponent,
} from './fractal/component/storage/paas/column_oriented_dbms';

export {KeyValueDbms} from './fractal/component/storage/paas/key_value_dbms';
export type {
  KeyValueDbmsBuilder,
  KeyValueDbmsConfig,
  KeyValueDbmsComponent,
} from './fractal/component/storage/paas/key_value_dbms';

export {GraphDbms} from './fractal/component/storage/paas/graph_dbms';
export type {
  GraphDbmsBuilder,
  GraphDbmsConfig,
  GraphDbmsComponent,
} from './fractal/component/storage/paas/graph_dbms';

// Storage CaaS — Container nodes
export {Search} from './fractal/component/storage/caas/search';
export type {
  SearchBuilder,
  SearchConfig,
  SearchComponent,
} from './fractal/component/storage/caas/search';

// ── Storage domain — Live system component helpers ───────────────────────────

// Live system — AWS Storage
export {AwsS3} from './live_system/component/storage/paas/aws_s3';
export type {
  AwsS3Builder,
  AwsS3Config,
  SatisfiedAwsS3Builder,
} from './live_system/component/storage/paas/aws_s3';

// Live system — Azure Storage
export {AzureStorageAccount} from './live_system/component/storage/paas/azure_storage_account';
export type {
  AzureStorageAccountBuilder,
  AzureStorageAccountConfig,
  SatisfiedAzureStorageAccountBuilder,
} from './live_system/component/storage/paas/azure_storage_account';

export {AzureBlobContainer} from './live_system/component/storage/paas/azure_blob_container';
export type {
  AzureBlobContainerBuilder,
  AzureBlobContainerConfig,
  SatisfiedAzureBlobContainerBuilder,
} from './live_system/component/storage/paas/azure_blob_container';

export {AzureFileStorage} from './live_system/component/storage/paas/azure_file_storage';
export type {
  AzureFileStorageBuilder,
  AzureFileStorageConfig,
  SatisfiedAzureFileStorageBuilder,
} from './live_system/component/storage/paas/azure_file_storage';

export {AzurePostgreSqlDbms} from './live_system/component/storage/paas/azure_postgresql_dbms';
export type {
  AzurePostgreSqlDbmsBuilder,
  AzurePostgreSqlDbmsConfig,
  SatisfiedAzurePostgreSqlDbmsBuilder,
} from './live_system/component/storage/paas/azure_postgresql_dbms';

export {AzurePostgreSqlDatabase} from './live_system/component/storage/paas/azure_postgresql_database';
export type {
  AzurePostgreSqlDatabaseBuilder,
  AzurePostgreSqlDatabaseConfig,
  SatisfiedAzurePostgreSqlDatabaseBuilder,
} from './live_system/component/storage/paas/azure_postgresql_database';

export {AzureCosmosDbAccount} from './live_system/component/storage/paas/azure_cosmosdb_account';
export type {
  AzureCosmosDbAccountBuilder,
  AzureCosmosDbAccountConfig,
  SatisfiedAzureCosmosDbAccountBuilder,
} from './live_system/component/storage/paas/azure_cosmosdb_account';

export {AzureCosmosDbMongoDatabase} from './live_system/component/storage/paas/azure_cosmosdb_mongo_database';
export type {
  AzureCosmosDbMongoDatabaseBuilder,
  AzureCosmosDbMongoDatabaseConfig,
  SatisfiedAzureCosmosDbMongoDatabaseBuilder,
} from './live_system/component/storage/paas/azure_cosmosdb_mongo_database';

export {AzureCosmosDbPostgreSqlDatabase} from './live_system/component/storage/paas/azure_cosmosdb_postgresql_database';
export type {
  AzureCosmosDbPostgreSqlDatabaseBuilder,
  AzureCosmosDbPostgreSqlDatabaseConfig,
  SatisfiedAzureCosmosDbPostgreSqlDatabaseBuilder,
} from './live_system/component/storage/paas/azure_cosmosdb_postgresql_database';

export {AzureCosmosDbCassandra} from './live_system/component/storage/paas/azure_cosmosdb_cassandra';
export type {
  AzureCosmosDbCassandraBuilder,
  AzureCosmosDbCassandraConfig,
  SatisfiedAzureCosmosDbCassandraBuilder,
} from './live_system/component/storage/paas/azure_cosmosdb_cassandra';

export {AzureCosmosDbTable} from './live_system/component/storage/paas/azure_cosmosdb_table';
export type {
  AzureCosmosDbTableBuilder,
  AzureCosmosDbTableConfig,
  SatisfiedAzureCosmosDbTableBuilder,
} from './live_system/component/storage/paas/azure_cosmosdb_table';

export {AzureCosmosDbGremlinDatabase} from './live_system/component/storage/paas/azure_cosmosdb_gremlin';
export type {
  AzureCosmosDbGremlinDatabaseBuilder,
  AzureCosmosDbGremlinDatabaseConfig,
  SatisfiedAzureCosmosDbGremlinDatabaseBuilder,
} from './live_system/component/storage/paas/azure_cosmosdb_gremlin';

// Live system — GCP Storage
export {GcpCloudStorage} from './live_system/component/storage/paas/gcp_cloud_storage';
export type {
  GcpCloudStorageBuilder,
  GcpCloudStorageConfig,
  SatisfiedGcpCloudStorageBuilder,
} from './live_system/component/storage/paas/gcp_cloud_storage';

export {GcpPostgreSqlDbms} from './live_system/component/storage/paas/gcp_postgresql_dbms';
export type {
  GcpPostgreSqlDbmsBuilder,
  GcpPostgreSqlDbmsConfig,
  SatisfiedGcpPostgreSqlDbmsBuilder,
} from './live_system/component/storage/paas/gcp_postgresql_dbms';

export {GcpPostgreSqlDatabase} from './live_system/component/storage/paas/gcp_postgresql_database';
export type {
  GcpPostgreSqlDatabaseBuilder,
  GcpPostgreSqlDatabaseConfig,
  SatisfiedGcpPostgreSqlDatabaseBuilder,
} from './live_system/component/storage/paas/gcp_postgresql_database';

export {GcpFirestore} from './live_system/component/storage/paas/gcp_firestore';
export type {
  GcpFirestoreBuilder,
  GcpFirestoreConfig,
  SatisfiedGcpFirestoreBuilder,
} from './live_system/component/storage/paas/gcp_firestore';

export {GcpFirestoreCollection} from './live_system/component/storage/paas/gcp_firestore_collection';
export type {
  GcpFirestoreCollectionBuilder,
  GcpFirestoreCollectionConfig,
  SatisfiedGcpFirestoreCollectionBuilder,
} from './live_system/component/storage/paas/gcp_firestore_collection';

export {GcpBigTable} from './live_system/component/storage/paas/gcp_bigtable';
export type {
  GcpBigTableBuilder,
  GcpBigTableConfig,
  SatisfiedGcpBigTableBuilder,
} from './live_system/component/storage/paas/gcp_bigtable';

export {GcpBigTableTable} from './live_system/component/storage/paas/gcp_bigtable_table';
export type {
  GcpBigTableTableBuilder,
  GcpBigTableTableConfig,
  SatisfiedGcpBigTableTableBuilder,
} from './live_system/component/storage/paas/gcp_bigtable_table';

// Live system — CaaS Storage
export {Elastic} from './live_system/component/storage/caas/elastic';
export type {
  ElasticBuilder,
  ElasticConfig,
  SatisfiedElasticBuilder,
} from './live_system/component/storage/caas/elastic';

export {IndexPattern} from './live_system/component/storage/caas/index_pattern';
export type {
  IndexPatternBuilder,
  IndexPatternConfig,
  SatisfiedIndexPatternBuilder,
} from './live_system/component/storage/caas/index_pattern';

// Live system — SaaS Storage
export {SaaSUnmanaged} from './live_system/component/storage/saas/unmanaged';
export type {
  SaaSUnmanagedBuilder,
  SaaSUnmanagedConfig,
  SatisfiedSaaSUnmanagedBuilder,
} from './live_system/component/storage/saas/unmanaged';
