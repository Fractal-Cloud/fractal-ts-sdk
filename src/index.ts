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
import * as CustomInternal from './custom';

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

export const Custom = CustomInternal.Custom;
export type {
  CustomBlueprintConfig,
  CustomBlueprintFactory,
  CustomBlueprintBuilder,
  CustomOfferConfig,
  CustomOfferFactory,
  CustomOfferBuilder,
  CustomSatisfiedBuilder,
  CustomComponentConfig,
} from './custom';

// ── NetworkAndCompute Blueprint — abstract components ───────────────────────
// Each abstract component carries candidate Offers; the dev specialises through
// a Fractal Interface using vendor-neutral concepts only. The Provider chosen at
// instantiation selects the concrete Offer.

export {VirtualNetwork} from './fractal/component/network_and_compute/iaas/virtual_network';
export type {VirtualNetworkConfig} from './fractal/component/network_and_compute/iaas/virtual_network';

export {Subnet} from './fractal/component/network_and_compute/iaas/subnet';
export type {SubnetConfig} from './fractal/component/network_and_compute/iaas/subnet';

export {SecurityGroup} from './fractal/component/network_and_compute/iaas/security_group';
export type {
  SecurityGroupConfig,
  IngressRule,
} from './fractal/component/network_and_compute/iaas/security_group';

export {VirtualMachine} from './fractal/component/network_and_compute/iaas/vm';
export type {VirtualMachineConfig} from './fractal/component/network_and_compute/iaas/vm';

export {LoadBalancer} from './fractal/component/network_and_compute/iaas/load_balancer';
export type {LoadBalancerConfig} from './fractal/component/network_and_compute/iaas/load_balancer';

export {ElasticIp} from './fractal/component/network_and_compute/iaas/elastic_ip';
export type {ElasticIpConfig} from './fractal/component/network_and_compute/iaas/elastic_ip';

export {SshKeyPair} from './fractal/component/network_and_compute/iaas/ssh_key_pair';
export type {SshKeyPairConfig} from './fractal/component/network_and_compute/iaas/ssh_key_pair';

export {VpcPeering} from './fractal/component/network_and_compute/iaas/vpc_peering';
export type {VpcPeeringConfig} from './fractal/component/network_and_compute/iaas/vpc_peering';

export {VpnTunnel} from './fractal/component/network_and_compute/iaas/vpn_tunnel';
export type {VpnTunnelConfig} from './fractal/component/network_and_compute/iaas/vpn_tunnel';

// ── NetworkAndCompute Live system — IaaS offers ─────────────────────────────
// Offers satisfy an abstract NetworkAndCompute component. Each is a vendor-neutral
// `Offer` value (or a vendor-config factory) consumed by `createFractal`.

// VirtualNetwork offers
export {AwsVpc} from './live_system/component/network_and_compute/iaas/vpc';
export {AzureVnet} from './live_system/component/network_and_compute/iaas/azure_vnet';
export {GcpVpc} from './live_system/component/network_and_compute/iaas/gcp_vpc';
export {HetznerNetwork} from './live_system/component/network_and_compute/iaas/hetzner_network';
export {OciVcn} from './live_system/component/network_and_compute/iaas/oci_vcn';
export {ArubaVpc} from './live_system/component/network_and_compute/iaas/aruba_vpc';

// Subnet offers
export {AwsSubnet} from './live_system/component/network_and_compute/iaas/subnet';
export {AzureSubnet} from './live_system/component/network_and_compute/iaas/azure_subnet';
export {GcpSubnet} from './live_system/component/network_and_compute/iaas/gcp_subnet';
export {HetznerSubnet} from './live_system/component/network_and_compute/iaas/hetzner_subnet';
export {OciSubnet} from './live_system/component/network_and_compute/iaas/oci_subnet';
export {ArubaSubnet} from './live_system/component/network_and_compute/iaas/aruba_subnet';
export {VsphereVlan} from './live_system/component/network_and_compute/iaas/vsphere_vlan';
export {VspherePortGroup} from './live_system/component/network_and_compute/iaas/vsphere_port_group';

// SecurityGroup offers
export {AwsSecurityGroup} from './live_system/component/network_and_compute/iaas/security_group';
export {AzureNsg} from './live_system/component/network_and_compute/iaas/azure_nsg';
export type {AzureNsgVendorConfig} from './live_system/component/network_and_compute/iaas/azure_nsg';
export {GcpFirewall} from './live_system/component/network_and_compute/iaas/gcp_firewall';
export {HetznerFirewall} from './live_system/component/network_and_compute/iaas/hetzner_firewall';
export {OciSecurityList} from './live_system/component/network_and_compute/iaas/oci_security_list';
export type {OciSecurityListVendorConfig} from './live_system/component/network_and_compute/iaas/oci_security_list';
export {ArubaSecurityGroup} from './live_system/component/network_and_compute/iaas/aruba_security_group';
export type {ArubaSecurityGroupVendorConfig} from './live_system/component/network_and_compute/iaas/aruba_security_group';
export {OpenshiftSecurityGroup} from './live_system/component/network_and_compute/caas/openshift_security_group';
export type {OpenshiftSecurityGroupVendorConfig} from './live_system/component/network_and_compute/caas/openshift_security_group';

// VirtualMachine offers
export {Ec2Instance} from './live_system/component/network_and_compute/iaas/ec2_instance';
export {AzureVm} from './live_system/component/network_and_compute/iaas/azure_vm';
export {GcpVm} from './live_system/component/network_and_compute/iaas/gcp_vm';
export {HetznerServer} from './live_system/component/network_and_compute/iaas/hetzner_server';
export {OciInstance} from './live_system/component/network_and_compute/iaas/oci_instance';
export {ArubaCloudServer} from './live_system/component/network_and_compute/iaas/aruba_cloud_server';
export {VsphereVm} from './live_system/component/network_and_compute/iaas/vsphere_vm';
export {OpenshiftVm} from './live_system/component/network_and_compute/iaas/openshift_vm';

// LoadBalancer offers
export {AwsLb} from './live_system/component/network_and_compute/iaas/aws_lb';
export {AzureLb} from './live_system/component/network_and_compute/iaas/azure_lb';
export {GcpGlb} from './live_system/component/network_and_compute/iaas/gcp_glb';

// ── NetworkAndCompute Blueprint — PaaS abstract component ───────────────────
export {ContainerPlatform} from './fractal/component/network_and_compute/paas/container_platform';
export type {
  ContainerPlatformConfig,
  NodePoolConfig,
} from './fractal/component/network_and_compute/paas/container_platform';

export {ContainerRegistry} from './fractal/component/network_and_compute/paas/container_registry';
export type {ContainerRegistryConfig} from './fractal/component/network_and_compute/paas/container_registry';

// Blueprint component helpers — CaaS
// Workload migrated to the Fractal + Interface model: abstract capability +
// candidate functional Offers (M1).
export {Workload} from './fractal/component/custom_workloads/caas/workload';
export type {WorkloadConfig} from './fractal/component/custom_workloads/caas/workload';

// Blueprint component helpers — FaaS (serverless functions)
export {Function} from './fractal/component/custom_workloads/faas/function';
export type {
  FunctionBuilder,
  FunctionConfig,
  FunctionComponent,
  FunctionPackageType,
} from './fractal/component/custom_workloads/faas/function';

// Live system component helpers — FaaS offers (unified sourceArtifact contract)
export {AwsLambda} from './live_system/component/custom_workloads/faas/aws_lambda';
export type {
  AwsLambdaBuilder,
  AwsLambdaConfig,
  SatisfiedAwsLambdaBuilder,
} from './live_system/component/custom_workloads/faas/aws_lambda';

export {AzureFunction} from './live_system/component/custom_workloads/faas/azure_function';
export type {
  AzureFunctionBuilder,
  AzureFunctionConfig,
  SatisfiedAzureFunctionBuilder,
  AzureFunctionApplicationStack,
  AzureFunctionConfiguration,
  AzureFunctionCorsSettings,
  AzureFunctionIdentity,
  AzureFunctionAppServicePlan,
} from './live_system/component/custom_workloads/faas/azure_function';

export {GoogleFunction} from './live_system/component/custom_workloads/faas/gcp_google_function';
export type {
  GoogleFunctionBuilder,
  GoogleFunctionConfig,
  SatisfiedGoogleFunctionBuilder,
} from './live_system/component/custom_workloads/faas/gcp_google_function';

// Workload offer (Fractal + Interface, M1) — RedHat (OpenShift Workload)
export {OpenshiftWorkload} from './live_system/component/custom_workloads/caas/openshift_workload';

// Workload offer (Fractal + Interface, M1) — RedHat
export {OpenshiftService} from './live_system/component/network_and_compute/caas/openshift_service';

// (OpenshiftSecurityGroup offer is exported with the consolidated
//  NetworkAndCompute SecurityGroup offer section above.)

// ── NetworkAndCompute Live system — PaaS ContainerPlatform offers ───────────
export {Eks} from './live_system/component/network_and_compute/paas/eks_cluster';
export {Aks} from './live_system/component/network_and_compute/paas/azure_aks';
export {Gke} from './live_system/component/network_and_compute/paas/gcp_gke';
export {ArubaKaaS} from './live_system/component/network_and_compute/paas/aruba_kaas';

// Live system component helpers — AWS PaaS
export {EcsCluster} from './live_system/component/network_and_compute/paas/ecs_cluster';

// Workload offers (Fractal + Interface, M1). The AWS ECS Task Definition is a
// live-system-only sub-component built inline by the EcsService offer and has
// no standalone export.
export {EcsService} from './live_system/component/network_and_compute/paas/ecs_service';

// Workload offers (Fractal + Interface, M1) — Azure
export {AzureContainerAppsEnvironment} from './live_system/component/network_and_compute/paas/azure_container_apps_environment';
export {AzureContainerInstance} from './live_system/component/network_and_compute/paas/azure_container_instance';
export {AzureContainerApp} from './live_system/component/network_and_compute/paas/azure_container_app';

// Workload offer (Fractal + Interface, M1) — GCP
export {CloudRun} from './live_system/component/network_and_compute/paas/gcp_cloud_run_service';

// Workload offer (Fractal + Interface, M1) — OCI
export {OciContainerInstance} from './live_system/component/network_and_compute/paas/oci_container_instance';

// Live system component helpers — Aruba IaaS
// (ArubaVpc / ArubaSubnet / ArubaSecurityGroup / ArubaCloudServer offers are
//  exported with the consolidated NetworkAndCompute offer sections above.)
export {ArubaSshKeyPair} from './live_system/component/network_and_compute/iaas/aruba_ssh_key_pair';

export {ArubaVpcPeering} from './live_system/component/network_and_compute/iaas/aruba_vpc_peering';

export {ArubaVpnTunnel} from './live_system/component/network_and_compute/iaas/aruba_vpn_tunnel';

export {ArubaElasticIp} from './live_system/component/network_and_compute/iaas/aruba_elastic_ip';

// Live system component helpers — Aruba PaaS
export {ArubaContainerRegistry} from './live_system/component/network_and_compute/paas/aruba_container_registry';

// (Aruba Storage offers are exported with the consolidated Storage offer
//  section below.)

// Live system component helpers — CaaS K8s Workload
export {CaaSK8sWorkload} from './live_system/component/custom_workloads/caas/caas_k8s_workload';
export type {
  CaaSK8sWorkloadBuilder,
  CaaSK8sWorkloadConfig,
  SatisfiedCaaSK8sWorkloadBuilder,
} from './live_system/component/custom_workloads/caas/caas_k8s_workload';

// ── Storage domain — Blueprint abstract components ───────────────────────────
// Each abstract component carries candidate Offers; the dev specialises through
// a Fractal Interface using vendor-neutral concepts only. The Provider chosen at
// instantiation selects the concrete Offer.

// Storage IaaS
export {BlockStorage} from './fractal/component/storage/iaas/block_storage';
export type {BlockStorageConfig} from './fractal/component/storage/iaas/block_storage';

// Storage PaaS — Leaf nodes
export {FilesAndBlobs} from './fractal/component/storage/paas/files_and_blobs';
export type {FilesAndBlobsConfig} from './fractal/component/storage/paas/files_and_blobs';

export {RelationalDatabase} from './fractal/component/storage/paas/relational_database';
export type {RelationalDatabaseConfig} from './fractal/component/storage/paas/relational_database';

export {DocumentDatabase} from './fractal/component/storage/paas/document_database';
export type {DocumentDatabaseConfig} from './fractal/component/storage/paas/document_database';

export {ColumnOrientedEntity} from './fractal/component/storage/paas/column_oriented_entity';
export type {ColumnOrientedEntityConfig} from './fractal/component/storage/paas/column_oriented_entity';

export {KeyValueEntity} from './fractal/component/storage/paas/key_value_entity';
export type {KeyValueEntityConfig} from './fractal/component/storage/paas/key_value_entity';

export {GraphDatabase} from './fractal/component/storage/paas/graph_database';
export type {GraphDatabaseConfig} from './fractal/component/storage/paas/graph_database';

// Storage CaaS — Leaf nodes
export {SearchEntity} from './fractal/component/storage/caas/search_entity';
export type {SearchEntityConfig} from './fractal/component/storage/caas/search_entity';

// Storage SaaS — Leaf nodes
export {Unmanaged} from './fractal/component/storage/saas/unmanaged';
export type {UnmanagedConfig} from './fractal/component/storage/saas/unmanaged';

// Storage PaaS — Container nodes
export {RelationalDbms} from './fractal/component/storage/paas/relational_dbms';
export type {RelationalDbmsConfig} from './fractal/component/storage/paas/relational_dbms';

export {DocumentDbms} from './fractal/component/storage/paas/document_dbms';
export type {DocumentDbmsConfig} from './fractal/component/storage/paas/document_dbms';

export {ColumnOrientedDbms} from './fractal/component/storage/paas/column_oriented_dbms';
export type {ColumnOrientedDbmsConfig} from './fractal/component/storage/paas/column_oriented_dbms';

export {KeyValueDbms} from './fractal/component/storage/paas/key_value_dbms';
export type {KeyValueDbmsConfig} from './fractal/component/storage/paas/key_value_dbms';

export {GraphDbms} from './fractal/component/storage/paas/graph_dbms';
export type {GraphDbmsConfig} from './fractal/component/storage/paas/graph_dbms';

// Storage CaaS — Container nodes
export {Search} from './fractal/component/storage/caas/search';
export type {SearchConfig} from './fractal/component/storage/caas/search';

// ── Storage domain — Live system offers ──────────────────────────────────────
// Offers satisfy an abstract Storage component. Each is a vendor-neutral `Offer`
// value consumed by `createFractal`.

// Storage offers — AWS
export {AwsS3} from './live_system/component/storage/paas/aws_s3';
export {AwsDynamoDb} from './live_system/component/storage/paas/aws_dynamodb';

// Storage offers — Azure
export {AzureStorageAccount} from './live_system/component/storage/paas/azure_storage_account';
export {AzureBlobContainer} from './live_system/component/storage/paas/azure_blob_container';
export {AzureFileStorage} from './live_system/component/storage/paas/azure_file_storage';
export {AzurePostgreSqlDbms} from './live_system/component/storage/paas/azure_postgresql_dbms';
export {AzurePostgreSqlDatabase} from './live_system/component/storage/paas/azure_postgresql_database';
export {AzureCosmosDb} from './live_system/component/storage/paas/azure_cosmosdb';
export {AzureCosmosDbAccount} from './live_system/component/storage/paas/azure_cosmosdb_account';
export {AzureCosmosDbMongoDatabase} from './live_system/component/storage/paas/azure_cosmosdb_mongo_database';
export {AzureCosmosDbPostgreSqlDatabase} from './live_system/component/storage/paas/azure_cosmosdb_postgresql_database';
export {AzureCosmosDbCassandra} from './live_system/component/storage/paas/azure_cosmosdb_cassandra';
export {AzureCosmosDbTable} from './live_system/component/storage/paas/azure_cosmosdb_table';
export {
  AzureCosmosDbGremlin,
  AzureCosmosDbGremlinDatabase,
} from './live_system/component/storage/paas/azure_cosmosdb_gremlin';

// Storage offers — GCP
export {GcpCloudStorage} from './live_system/component/storage/paas/gcp_cloud_storage';
export {GcpPostgreSqlDbms} from './live_system/component/storage/paas/gcp_postgresql_dbms';
export {GcpPostgreSqlDatabase} from './live_system/component/storage/paas/gcp_postgresql_database';
export {GcpFirestore} from './live_system/component/storage/paas/gcp_firestore';
export {GcpFirestoreCollection} from './live_system/component/storage/paas/gcp_firestore_collection';
export {GcpBigtable} from './live_system/component/storage/paas/gcp_bigtable_dbms';
export {GcpBigTable} from './live_system/component/storage/paas/gcp_bigtable';
export {GcpBigTableTable} from './live_system/component/storage/paas/gcp_bigtable_table';

// Storage offers — Aruba
export {ArubaBlockStorage} from './live_system/component/storage/iaas/aruba_block_storage';
export {ArubaMySqlDbms} from './live_system/component/storage/paas/aruba_mysql_dbms';
export {ArubaMsSqlDbms} from './live_system/component/storage/paas/aruba_mssql_dbms';
export {ArubaObjectStorageAccount} from './live_system/component/storage/paas/aruba_object_storage_account';

// Storage offers — CaaS
export {Elastic} from './live_system/component/storage/caas/elastic';
export {IndexPattern} from './live_system/component/storage/caas/index_pattern';
export {OpenshiftPersistentVolume} from './live_system/component/storage/caas/openshift_persistent_volume';
export {CaaSMinioTenant} from './live_system/component/storage/caas/caas_minio_tenant';

// Storage offers — SaaS
export {SaaSUnmanaged} from './live_system/component/storage/saas/unmanaged';

// ── Messaging domain — Blueprint component helpers ───────────────────────────

// Messaging PaaS
export {MessagingEntity} from './fractal/component/messaging/paas/entity';
export type {
  MessagingEntityBuilder,
  MessagingEntityConfig,
  MessagingEntityComponent,
} from './fractal/component/messaging/paas/entity';

export {Broker} from './fractal/component/messaging/paas/broker';
export type {
  BrokerBuilder,
  BrokerConfig,
  BrokerComponent,
} from './fractal/component/messaging/paas/broker';

// Messaging CaaS
export {CaaSMessagingEntity} from './fractal/component/messaging/caas/entity';
export type {
  CaaSMessagingEntityBuilder,
  CaaSMessagingEntityConfig,
  CaaSMessagingEntityComponent,
} from './fractal/component/messaging/caas/entity';

export {CaaSBroker} from './fractal/component/messaging/caas/broker';
export type {
  CaaSBrokerBuilder,
  CaaSBrokerConfig,
  CaaSBrokerComponent,
} from './fractal/component/messaging/caas/broker';

// Messaging SaaS
export {MessagingUnmanaged} from './fractal/component/messaging/saas/unmanaged';
export type {
  MessagingUnmanagedBuilder,
  MessagingUnmanagedConfig,
  MessagingUnmanagedComponent,
} from './fractal/component/messaging/saas/unmanaged';

// ── Messaging domain — Live system component helpers ─────────────────────────

// Live system — Azure Messaging
export {AzureServiceBus} from './live_system/component/messaging/paas/azure_service_bus';
export type {
  AzureServiceBusBuilder,
  AzureServiceBusConfig,
  SatisfiedAzureServiceBusBuilder,
} from './live_system/component/messaging/paas/azure_service_bus';

export {AzureServiceBusTopic} from './live_system/component/messaging/paas/azure_service_bus_topic';
export type {
  AzureServiceBusTopicBuilder,
  AzureServiceBusTopicConfig,
  SatisfiedAzureServiceBusTopicBuilder,
} from './live_system/component/messaging/paas/azure_service_bus_topic';

export {AzureServiceBusQueue} from './live_system/component/messaging/paas/azure_service_bus_queue';
export type {
  AzureServiceBusQueueBuilder,
  AzureServiceBusQueueConfig,
  SatisfiedAzureServiceBusQueueBuilder,
} from './live_system/component/messaging/paas/azure_service_bus_queue';

export {AzureRelay} from './live_system/component/messaging/paas/azure_relay';
export type {
  AzureRelayBuilder,
  AzureRelayConfig,
  SatisfiedAzureRelayBuilder,
} from './live_system/component/messaging/paas/azure_relay';

export {AzureEventHubNamespace} from './live_system/component/messaging/paas/azure_eventhub_namespace';
export type {
  AzureEventHubNamespaceBuilder,
  AzureEventHubNamespaceConfig,
  SatisfiedAzureEventHubNamespaceBuilder,
} from './live_system/component/messaging/paas/azure_eventhub_namespace';

export {AzureEventHub} from './live_system/component/messaging/paas/azure_eventhub';
export type {
  AzureEventHubBuilder,
  AzureEventHubConfig,
  SatisfiedAzureEventHubBuilder,
} from './live_system/component/messaging/paas/azure_eventhub';

// Live system — GCP Messaging
export {GcpPubSub} from './live_system/component/messaging/paas/gcp_pubsub';
export type {
  GcpPubSubBuilder,
  GcpPubSubConfig,
  SatisfiedGcpPubSubBuilder,
} from './live_system/component/messaging/paas/gcp_pubsub';

export {GcpPubSubTopic} from './live_system/component/messaging/paas/gcp_pubsub_topic';
export type {
  GcpPubSubTopicBuilder,
  GcpPubSubTopicConfig,
  SatisfiedGcpPubSubTopicBuilder,
} from './live_system/component/messaging/paas/gcp_pubsub_topic';

export {GcpPubSubSubscription} from './live_system/component/messaging/paas/gcp_pubsub_subscription';
export type {
  GcpPubSubSubscriptionBuilder,
  GcpPubSubSubscriptionConfig,
  SatisfiedGcpPubSubSubscriptionBuilder,
} from './live_system/component/messaging/paas/gcp_pubsub_subscription';

// Live system — CaaS Messaging
export {Kafka} from './live_system/component/messaging/caas/kafka';
export type {
  KafkaBuilder,
  KafkaConfig,
  SatisfiedKafkaBuilder,
} from './live_system/component/messaging/caas/kafka';

export {KafkaTopic} from './live_system/component/messaging/caas/kafka_topic';
export type {
  KafkaTopicBuilder,
  KafkaTopicConfig,
  SatisfiedKafkaTopicBuilder,
} from './live_system/component/messaging/caas/kafka_topic';

// Live system — SaaS Messaging
export {MessagingSaaSUnmanaged} from './live_system/component/messaging/saas/unmanaged';
export type {
  MessagingSaaSUnmanagedBuilder,
  MessagingSaaSUnmanagedConfig,
  SatisfiedMessagingSaaSUnmanagedBuilder,
} from './live_system/component/messaging/saas/unmanaged';

// ── BigData domain — Blueprint component helpers ─────────────────────────────

export {DistributedDataProcessing} from './fractal/component/big_data/paas/distributed_data_processing';
export type {
  DistributedDataProcessingBuilder,
  DistributedDataProcessingConfig,
  DistributedDataProcessingComponent,
} from './fractal/component/big_data/paas/distributed_data_processing';

export {ComputeCluster} from './fractal/component/big_data/paas/compute_cluster';
export type {
  ComputeClusterBuilder,
  ComputeClusterConfig,
  ComputeClusterComponent,
} from './fractal/component/big_data/paas/compute_cluster';

export {DataProcessingJob} from './fractal/component/big_data/paas/data_processing_job';
export type {
  DataProcessingJobBuilder,
  DataProcessingJobConfig,
  DataProcessingJobComponent,
  DataProcessingJobDatalakeLink,
  DatalakeLinkSettings,
  DatalakePurpose,
  DataProcessingJobMessagingLink,
  DataProcessingJobMessagingLinkSettings,
  DataProcessingJobMessagingAccessType,
} from './fractal/component/big_data/paas/data_processing_job';

export {MlExperiment} from './fractal/component/big_data/paas/ml_experiment';
export type {
  MlExperimentBuilder,
  MlExperimentConfig,
  MlExperimentComponent,
} from './fractal/component/big_data/paas/ml_experiment';

export {Datalake} from './fractal/component/big_data/paas/datalake';
export type {
  DatalakeBuilder,
  DatalakeConfig,
  DatalakeComponent,
} from './fractal/component/big_data/paas/datalake';

export {BigDataUnmanaged} from './fractal/component/big_data/saas/unmanaged';
export type {
  BigDataUnmanagedBuilder,
  BigDataUnmanagedConfig,
  BigDataUnmanagedComponent,
} from './fractal/component/big_data/saas/unmanaged';

// ── BigData domain — Live system component helpers ───────────────────────────

// Live system — AWS BigData
export {AwsDatabricks} from './live_system/component/big_data/paas/aws_databricks';
export type {
  AwsDatabricksBuilder,
  AwsDatabricksConfig,
  SatisfiedAwsDatabricksBuilder,
} from './live_system/component/big_data/paas/aws_databricks';

export {AwsDatabricksCluster} from './live_system/component/big_data/paas/aws_databricks_cluster';
export type {
  AwsDatabricksClusterBuilder,
  AwsDatabricksClusterConfig,
  SatisfiedAwsDatabricksClusterBuilder,
} from './live_system/component/big_data/paas/aws_databricks_cluster';

export {AwsDatabricksJob} from './live_system/component/big_data/paas/aws_databricks_job';
export type {
  AwsDatabricksJobBuilder,
  AwsDatabricksJobConfig,
  SatisfiedAwsDatabricksJobBuilder,
} from './live_system/component/big_data/paas/aws_databricks_job';

export {AwsDatabricksMlflow} from './live_system/component/big_data/paas/aws_databricks_mlflow';
export type {
  AwsDatabricksMlflowBuilder,
  AwsDatabricksMlflowConfig,
  SatisfiedAwsDatabricksMlflowBuilder,
} from './live_system/component/big_data/paas/aws_databricks_mlflow';

export {AwsS3Datalake} from './live_system/component/big_data/paas/aws_s3_datalake';
export type {
  AwsS3DatalakeBuilder,
  AwsS3DatalakeConfig,
  SatisfiedAwsS3DatalakeBuilder,
} from './live_system/component/big_data/paas/aws_s3_datalake';

// Live system — Azure BigData
export {AzureDatabricks} from './live_system/component/big_data/paas/azure_databricks';
export type {
  AzureDatabricksBuilder,
  AzureDatabricksConfig,
  SatisfiedAzureDatabricksBuilder,
} from './live_system/component/big_data/paas/azure_databricks';

export {AzureDatabricksCluster} from './live_system/component/big_data/paas/azure_databricks_cluster';
export type {
  AzureDatabricksClusterBuilder,
  AzureDatabricksClusterConfig,
  SatisfiedAzureDatabricksClusterBuilder,
} from './live_system/component/big_data/paas/azure_databricks_cluster';

export {AzureDatabricksJob} from './live_system/component/big_data/paas/azure_databricks_job';
export type {
  AzureDatabricksJobBuilder,
  AzureDatabricksJobConfig,
  SatisfiedAzureDatabricksJobBuilder,
} from './live_system/component/big_data/paas/azure_databricks_job';

export {AzureDatabricksMlflow} from './live_system/component/big_data/paas/azure_databricks_mlflow';
export type {
  AzureDatabricksMlflowBuilder,
  AzureDatabricksMlflowConfig,
  SatisfiedAzureDatabricksMlflowBuilder,
} from './live_system/component/big_data/paas/azure_databricks_mlflow';

export {AzureDatalake} from './live_system/component/big_data/paas/azure_datalake';
export type {
  AzureDatalakeBuilder,
  AzureDatalakeConfig,
  SatisfiedAzureDatalakeBuilder,
} from './live_system/component/big_data/paas/azure_datalake';

// Live system — GCP BigData
export {GcpDatabricks} from './live_system/component/big_data/paas/gcp_databricks';
export type {
  GcpDatabricksBuilder,
  GcpDatabricksConfig,
  SatisfiedGcpDatabricksBuilder,
} from './live_system/component/big_data/paas/gcp_databricks';

export {GcpDatabricksCluster} from './live_system/component/big_data/paas/gcp_databricks_cluster';
export type {
  GcpDatabricksClusterBuilder,
  GcpDatabricksClusterConfig,
  SatisfiedGcpDatabricksClusterBuilder,
} from './live_system/component/big_data/paas/gcp_databricks_cluster';

export {GcpDatabricksJob} from './live_system/component/big_data/paas/gcp_databricks_job';
export type {
  GcpDatabricksJobBuilder,
  GcpDatabricksJobConfig,
  SatisfiedGcpDatabricksJobBuilder,
} from './live_system/component/big_data/paas/gcp_databricks_job';

export {GcpDatabricksMlflow} from './live_system/component/big_data/paas/gcp_databricks_mlflow';
export type {
  GcpDatabricksMlflowBuilder,
  GcpDatabricksMlflowConfig,
  SatisfiedGcpDatabricksMlflowBuilder,
} from './live_system/component/big_data/paas/gcp_databricks_mlflow';

export {GcpDatalake} from './live_system/component/big_data/paas/gcp_datalake';
export type {
  GcpDatalakeBuilder,
  GcpDatalakeConfig,
  SatisfiedGcpDatalakeBuilder,
} from './live_system/component/big_data/paas/gcp_datalake';

// Live system — SaaS BigData
export {BigDataSaaSUnmanaged} from './live_system/component/big_data/saas/unmanaged';
export type {
  BigDataSaaSUnmanagedBuilder,
  BigDataSaaSUnmanagedConfig,
  SatisfiedBigDataSaaSUnmanagedBuilder,
} from './live_system/component/big_data/saas/unmanaged';

// Live system — CaaS BigData
export {CaaSSparkOperator} from './live_system/component/big_data/caas/caas_spark_operator';
export type {
  CaaSSparkOperatorBuilder,
  CaaSSparkOperatorConfig,
  SatisfiedCaaSSparkOperatorBuilder,
} from './live_system/component/big_data/caas/caas_spark_operator';

export {CaaSSparkCluster} from './live_system/component/big_data/caas/caas_spark_cluster';
export type {
  CaaSSparkClusterBuilder,
  CaaSSparkClusterConfig,
  SatisfiedCaaSSparkClusterBuilder,
} from './live_system/component/big_data/caas/caas_spark_cluster';

export {CaaSSparkJob} from './live_system/component/big_data/caas/caas_spark_job';
export type {
  CaaSSparkJobBuilder,
  CaaSSparkJobConfig,
  SatisfiedCaaSSparkJobBuilder,
} from './live_system/component/big_data/caas/caas_spark_job';

export {CaaSMlflow} from './live_system/component/big_data/caas/caas_mlflow';
export type {
  CaaSMlflowBuilder,
  CaaSMlflowConfig,
  SatisfiedCaaSMlflowBuilder,
} from './live_system/component/big_data/caas/caas_mlflow';

// ── APIManagement Blueprint helpers ─────────────────────────────────────────

export {PaaSApiGateway} from './fractal/component/api_management/paas/api_gateway';
export type {
  PaaSApiGatewayBuilder,
  PaaSApiGatewayConfig,
  PaaSApiGatewayComponent,
} from './fractal/component/api_management/paas/api_gateway';

export {CaaSApiGateway} from './fractal/component/api_management/caas/api_gateway';
export type {
  CaaSApiGatewayBuilder,
  CaaSApiGatewayConfig,
  CaaSApiGatewayComponent,
} from './fractal/component/api_management/caas/api_gateway';

export {ApiManagementUnmanaged} from './fractal/component/api_management/saas/unmanaged';
export type {
  ApiManagementUnmanagedBuilder,
  ApiManagementUnmanagedConfig,
  ApiManagementUnmanagedComponent,
} from './fractal/component/api_management/saas/unmanaged';

// ── APIManagement Live system — AWS ─────────────────────────────────────────

export {AwsCloudFront} from './live_system/component/api_management/paas/aws_cloudfront';
export type {
  AwsCloudFrontBuilder,
  AwsCloudFrontConfig,
  SatisfiedAwsCloudFrontBuilder,
} from './live_system/component/api_management/paas/aws_cloudfront';

// ── APIManagement Live system — Azure ───────────────────────────────────────

export {AzureApiManagement} from './live_system/component/api_management/paas/azure_api_management';
export type {
  AzureApiManagementBuilder,
  AzureApiManagementConfig,
  SatisfiedAzureApiManagementBuilder,
} from './live_system/component/api_management/paas/azure_api_management';

// ── APIManagement Live system — GCP ─────────────────────────────────────────

export {GcpApiGateway} from './live_system/component/api_management/paas/gcp_api_gateway';
export type {
  GcpApiGatewayBuilder,
  GcpApiGatewayConfig,
  SatisfiedGcpApiGatewayBuilder,
} from './live_system/component/api_management/paas/gcp_api_gateway';

// ── APIManagement Live system — CaaS ────────────────────────────────────────

export {Ambassador} from './live_system/component/api_management/caas/ambassador';
export type {
  AmbassadorBuilder,
  AmbassadorConfig,
  SatisfiedAmbassadorBuilder,
} from './live_system/component/api_management/caas/ambassador';

export {Traefik} from './live_system/component/api_management/caas/traefik';
export type {
  TraefikBuilder,
  TraefikConfig,
  SatisfiedTraefikBuilder,
} from './live_system/component/api_management/caas/traefik';

// ── APIManagement Live system — SaaS ────────────────────────────────────────

export {ApiManagementSaaSUnmanaged} from './live_system/component/api_management/saas/unmanaged';
export type {
  ApiManagementSaaSUnmanagedBuilder,
  ApiManagementSaaSUnmanagedConfig,
  SatisfiedApiManagementSaaSUnmanagedBuilder,
} from './live_system/component/api_management/saas/unmanaged';

// ── Observability Blueprint helpers ─────────────────────────────────────────

export {Monitoring} from './fractal/component/observability/caas/monitoring';
export type {
  MonitoringBuilder,
  MonitoringConfig,
  MonitoringComponent,
} from './fractal/component/observability/caas/monitoring';

export {Tracing} from './fractal/component/observability/caas/tracing';
export type {
  TracingBuilder,
  TracingConfig,
  TracingComponent,
} from './fractal/component/observability/caas/tracing';

export {Logging} from './fractal/component/observability/caas/logging';
export type {
  LoggingBuilder,
  LoggingConfig,
  LoggingComponent,
} from './fractal/component/observability/caas/logging';

export {ObservabilityUnmanaged} from './fractal/component/observability/saas/unmanaged';
export type {
  ObservabilityUnmanagedBuilder,
  ObservabilityUnmanagedConfig,
  ObservabilityUnmanagedComponent,
} from './fractal/component/observability/saas/unmanaged';

// ── Observability Live system — CaaS ────────────────────────────────────────

export {Prometheus} from './live_system/component/observability/caas/prometheus';
export type {
  PrometheusBuilder,
  PrometheusConfig,
  SatisfiedPrometheusBuilder,
} from './live_system/component/observability/caas/prometheus';

export {Jaeger} from './live_system/component/observability/caas/jaeger';
export type {
  JaegerBuilder,
  JaegerConfig,
  SatisfiedJaegerBuilder,
} from './live_system/component/observability/caas/jaeger';

export {ObservabilityElastic} from './live_system/component/observability/caas/elastic';
export type {
  ObservabilityElasticBuilder,
  ObservabilityElasticConfig,
  SatisfiedObservabilityElasticBuilder,
} from './live_system/component/observability/caas/elastic';

// ── Observability Live system — SaaS ────────────────────────────────────────

export {ObservabilitySaaSUnmanaged} from './live_system/component/observability/saas/unmanaged';
export type {
  ObservabilitySaaSUnmanagedBuilder,
  ObservabilitySaaSUnmanagedConfig,
  SatisfiedObservabilitySaaSUnmanagedBuilder,
} from './live_system/component/observability/saas/unmanaged';

// ── Security Blueprint helpers ──────────────────────────────────────────────

export {ServiceMesh} from './fractal/component/security/caas/service_mesh';
export type {
  ServiceMeshBuilder,
  ServiceMeshConfig,
  ServiceMeshComponent,
} from './fractal/component/security/caas/service_mesh';

export {SecurityUnmanaged} from './fractal/component/security/saas/unmanaged';
export type {
  SecurityUnmanagedBuilder,
  SecurityUnmanagedConfig,
  SecurityUnmanagedComponent,
} from './fractal/component/security/saas/unmanaged';

// ── Security Live system — CaaS ─────────────────────────────────────────────

export {Ocelot} from './live_system/component/security/caas/ocelot';
export type {
  OcelotBuilder,
  OcelotConfig,
  SatisfiedOcelotBuilder,
} from './live_system/component/security/caas/ocelot';

// ── Security Live system — SaaS ─────────────────────────────────────────────

export {SecuritySaaSUnmanaged} from './live_system/component/security/saas/unmanaged';
export type {
  SecuritySaaSUnmanagedBuilder,
  SecuritySaaSUnmanagedConfig,
  SatisfiedSecuritySaaSUnmanagedBuilder,
} from './live_system/component/security/saas/unmanaged';

// ── Fractal + Interface (book model) ────────────────────────────────────────
// A Fractal bundles a Blueprint of abstract components (each carrying candidate
// Offers) with a typed Interface. Devs specialise through the Interface only; the
// Provider chosen at instantiation selects the concrete Offer.

export {createFractal} from './fractal/create_fractal';
export type {
  Fractal as FractalDefinitionResult,
  FractalDefinition,
  Blueprint,
  ChainableOperations,
} from './fractal/create_fractal';

export type {Offer, OfferInstantiationContext} from './fractal/offer';
export {instantiateFromNeutral} from './fractal/offer';

export {createAbstractComponent} from './fractal/component/abstract_component';
export type {
  AbstractComponent,
  AbstractComponentConfig,
} from './fractal/component/abstract_component';
export type {BlueprintComponentService} from './fractal/component/service';

// ── Security Blueprint — IdentityProvider (abstract) ────────────────────────

export {IdentityProvider} from './fractal/component/security/identity_provider';
export type {IdentityProviderConfig} from './fractal/component/security/identity_provider';

// ── Security Live system — IdentityProvider offers ──────────────────────────

export {Cognito} from './live_system/component/security/paas/cognito';
export {Keycloak} from './live_system/component/security/caas/keycloak';
