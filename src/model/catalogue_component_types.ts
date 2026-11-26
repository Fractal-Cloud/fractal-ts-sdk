/**
 * catalogue_component_types.ts — the catalogue's name for each abstract Component.
 *
 * The SDK keys components internally by an abstract, vendor-neutral tag
 * (`BigData.DistributedDataProcessing`), which is what offers `satisfy` and what
 * `select` is checked against. The platform catalogue (the Live System editor,
 * the BFF and the agents) declares its Level-1 components with the service
 * delivery model in the middle (`BigData.PaaS.DistributedDataProcessing`) and
 * attaches services and offers to exactly that string. A blueprint component
 * published under the abstract tag matches no catalogue component, so the editor
 * lists no services and no offers for it.
 *
 * This table is applied only to the blueprint wire body. Each entry is the
 * catalogue component the abstract tag belongs to by default (the delivery model
 * the component's primary offers use). Where the catalogue spells the component
 * differently from the SDK (`ObjectStorage` is `Storage.PaaS.FilesAndBlobs`),
 * the catalogue's spelling is used.
 *
 * `Unmanaged` is deliberately absent: the catalogue has one Unmanaged component
 * per domain (`AI.SaaS.Unmanaged`, `Storage.SaaS.Unmanaged`, ...), so the abstract
 * tag cannot name one. It is published unchanged.
 */
export const CATALOGUE_COMPONENT_TYPES: Readonly<Record<string, string>> = {
  'APIManagement.ApiGateway': 'APIManagement.PaaS.APIGateway',

  'BigData.ComputeCluster': 'BigData.PaaS.ComputeCluster',
  'BigData.Datalake': 'BigData.PaaS.Datalake',
  'BigData.DataProcessingJob': 'BigData.PaaS.DataProcessingJob',
  'BigData.DistributedDataProcessing': 'BigData.PaaS.DistributedDataProcessing',
  'BigData.MlExperiment': 'BigData.PaaS.MlExperiment',

  'CustomWorkloads.Function': 'CustomWorkloads.FaaS.Workload',
  'CustomWorkloads.Workload': 'CustomWorkloads.CaaS.Workload',

  'Messaging.Broker': 'Messaging.PaaS.Broker',
  'Messaging.EmailSender': 'Messaging.EmailSender',
  'Messaging.MessagingEntity': 'Messaging.PaaS.Entity',

  'NetworkAndCompute.ContainerPlatform':
    'NetworkAndCompute.PaaS.ContainerPlatform',
  'NetworkAndCompute.DnsZone': 'NetworkAndCompute.PaaS.DnsZone',
  'NetworkAndCompute.LoadBalancer': 'NetworkAndCompute.IaaS.LoadBalancer',
  'NetworkAndCompute.SecurityGroup': 'NetworkAndCompute.IaaS.SecurityGroup',
  'NetworkAndCompute.Subnet': 'NetworkAndCompute.IaaS.Subnet',
  'NetworkAndCompute.VirtualMachine': 'NetworkAndCompute.IaaS.VirtualMachine',
  'NetworkAndCompute.VirtualNetwork': 'NetworkAndCompute.IaaS.VirtualNetwork',

  'Observability.Logging': 'Observability.CaaS.Logging',
  'Observability.LogShipper': 'Observability.CaaS.LogShipper',
  'Observability.Monitoring': 'Observability.CaaS.Monitoring',
  'Observability.Tracing': 'Observability.CaaS.Tracing',

  'Security.IdentityProvider': 'Security.PaaS.IdentityProvider',
  'Security.ServiceMesh': 'Security.CaaS.ServiceMeshSecurity',

  'Storage.ObjectStorage': 'Storage.PaaS.FilesAndBlobs',
  'Storage.RelationalDatabase': 'Storage.PaaS.RelationalDatabase',
  'Storage.RelationalDbms': 'Storage.PaaS.RelationalDbms',
  'Storage.Search': 'Storage.CaaS.Search',
};

/** The catalogue component type a blueprint publishes for an abstract tag. A tag
 *  with no entry (`Unmanaged`, or a component outside this SDK) is unchanged. */
export const catalogueComponentType = (abstractType: string): string =>
  CATALOGUE_COMPONENT_TYPES[abstractType] ?? abstractType;
