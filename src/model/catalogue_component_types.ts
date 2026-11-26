/**
 * catalogue_component_types.ts — the catalogue's component for each abstract
 * Component, per service delivery model.
 *
 * The SDK keys components internally by an abstract, vendor-neutral tag
 * (`BigData.ComputeCluster`), which is what offers `satisfy`. The platform
 * catalogue declares its Level-1 components with the delivery model in the
 * middle and attaches services and offers to exactly that string, one component
 * per model: `BigData.PaaS.ComputeCluster` (Databricks) and
 * `BigData.CaaS.ComputeCluster` (Spark on Kubernetes) are different components.
 *
 * So a blueprint component has a delivery model, and an offer may only be
 * selected for it when the offer's delivery model is the same one. The author
 * states the model with the factory's `deliveryModel` option; unstated, it is
 * the component's `default` below. The model decides which catalogue component
 * the blueprint publishes (`catalogueComponentType`).
 *
 * `Unmanaged` is deliberately absent: the catalogue has one Unmanaged component
 * per domain, so the abstract tag cannot name one and no model is enforced.
 */
import type {DeliveryModel} from './core';

export type CatalogueComponent = {
  /** The model used when the author states none. */
  readonly default: DeliveryModel;
  /** The catalogue component for each model it has one for. */
  readonly types: Readonly<Partial<Record<DeliveryModel, string>>>;
};

export const CATALOGUE_COMPONENTS: Readonly<
  Record<string, CatalogueComponent>
> = {
  'APIManagement.ApiGateway': {
    default: 'PaaS',
    types: {
      PaaS: 'APIManagement.PaaS.APIGateway',
      CaaS: 'APIManagement.CaaS.APIGateway',
    },
  },

  'BigData.ComputeCluster': {
    default: 'PaaS',
    types: {
      PaaS: 'BigData.PaaS.ComputeCluster',
      CaaS: 'BigData.CaaS.ComputeCluster',
    },
  },
  'BigData.Datalake': {
    default: 'PaaS',
    types: {
      PaaS: 'BigData.PaaS.Datalake',
      CaaS: 'BigData.CaaS.Datalake',
    },
  },
  'BigData.DataProcessingJob': {
    default: 'PaaS',
    types: {
      PaaS: 'BigData.PaaS.DataProcessingJob',
      CaaS: 'BigData.CaaS.DataProcessingJob',
    },
  },
  'BigData.DistributedDataProcessing': {
    default: 'PaaS',
    types: {
      PaaS: 'BigData.PaaS.DistributedDataProcessing',
      CaaS: 'BigData.CaaS.DistributedDataProcessing',
    },
  },
  'BigData.MlExperiment': {
    default: 'PaaS',
    types: {
      PaaS: 'BigData.PaaS.MlExperiment',
      CaaS: 'BigData.CaaS.MlExperiment',
    },
  },

  'CustomWorkloads.Function': {
    default: 'FaaS',
    types: {FaaS: 'CustomWorkloads.FaaS.Workload'},
  },
  'CustomWorkloads.Workload': {
    default: 'CaaS',
    types: {
      CaaS: 'CustomWorkloads.CaaS.Workload',
      PaaS: 'CustomWorkloads.PaaS.Workload',
      IaaS: 'CustomWorkloads.IaaS.Workload',
    },
  },

  'Messaging.Broker': {
    default: 'PaaS',
    types: {
      PaaS: 'Messaging.PaaS.Broker',
      CaaS: 'Messaging.CaaS.Broker',
    },
  },
  'Messaging.MessagingEntity': {
    default: 'PaaS',
    types: {
      PaaS: 'Messaging.PaaS.Entity',
      CaaS: 'Messaging.CaaS.Entity',
    },
  },

  'NetworkAndCompute.ContainerPlatform': {
    default: 'PaaS',
    types: {PaaS: 'NetworkAndCompute.PaaS.ContainerPlatform'},
  },
  'NetworkAndCompute.DnsZone': {
    default: 'PaaS',
    types: {PaaS: 'NetworkAndCompute.PaaS.DnsZone'},
  },
  'NetworkAndCompute.LoadBalancer': {
    default: 'IaaS',
    types: {IaaS: 'NetworkAndCompute.IaaS.LoadBalancer'},
  },
  'NetworkAndCompute.SecurityGroup': {
    default: 'IaaS',
    types: {IaaS: 'NetworkAndCompute.IaaS.SecurityGroup'},
  },
  'NetworkAndCompute.Subnet': {
    default: 'IaaS',
    types: {IaaS: 'NetworkAndCompute.IaaS.Subnet'},
  },
  'NetworkAndCompute.VirtualMachine': {
    default: 'IaaS',
    types: {IaaS: 'NetworkAndCompute.IaaS.VirtualMachine'},
  },
  'NetworkAndCompute.VirtualNetwork': {
    default: 'IaaS',
    types: {IaaS: 'NetworkAndCompute.IaaS.VirtualNetwork'},
  },

  'Observability.Logging': {
    default: 'CaaS',
    types: {CaaS: 'Observability.CaaS.Logging'},
  },
  'Observability.LogShipper': {
    default: 'CaaS',
    types: {CaaS: 'Observability.CaaS.LogShipper'},
  },
  'Observability.Monitoring': {
    default: 'CaaS',
    types: {CaaS: 'Observability.CaaS.Monitoring'},
  },
  'Observability.Tracing': {
    default: 'CaaS',
    types: {CaaS: 'Observability.CaaS.Tracing'},
  },

  'Security.IdentityProvider': {
    default: 'PaaS',
    types: {PaaS: 'Security.PaaS.IdentityProvider'},
  },
  'Security.ServiceMesh': {
    default: 'CaaS',
    types: {CaaS: 'Security.CaaS.ServiceMeshSecurity'},
  },

  'Storage.ObjectStorage': {
    default: 'PaaS',
    types: {
      PaaS: 'Storage.PaaS.FilesAndBlobs',
      CaaS: 'Storage.CaaS.ObjectStorage',
    },
  },
  'Storage.RelationalDatabase': {
    default: 'PaaS',
    types: {
      PaaS: 'Storage.PaaS.RelationalDatabase',
      CaaS: 'Storage.CaaS.RelationalDatabase',
    },
  },
  'Storage.RelationalDbms': {
    default: 'PaaS',
    types: {
      PaaS: 'Storage.PaaS.RelationalDbms',
      CaaS: 'Storage.CaaS.RelationalDbms',
    },
  },
  'Storage.Search': {
    default: 'CaaS',
    types: {CaaS: 'Storage.CaaS.Search'},
  },

  // The catalogue's one model-less component: `Messaging.EmailSender`. Its
  // offers are PaaS, and it is published under that name.
  'Messaging.EmailSender': {
    default: 'PaaS',
    types: {PaaS: 'Messaging.EmailSender'},
  },
};

/**
 * Offers that deliberately sit on a component of another delivery model than
 * their own, because the catalogue has no component of their model. Each is a
 * known gap, not a licence: the rule is that an offer's delivery model equals
 * its component's.
 *
 *  - The two OpenShift IaaS offers and the OpenShift load balancer: the agent
 *    publishes their type as `NetworkAndCompute.CaaS.Openshift*` and registers
 *    its handlers on that string, so the type, and with it the model they
 *    declare, cannot change in the SDK alone. The catalogue's Subnet, Security
 *    Group and Load Balancer exist only as IaaS.
 *  - Keycloak: the catalogue's IdentityProvider exists only as PaaS.
 *  - AzureContainerApp: a PaaS offer the catalogue files under the CaaS
 *    Workload on purpose (webbff customWorkload.ts): a Container App nests in
 *    the Container Apps Environment, which is that component's container
 *    platform, and `CustomWorkloads.PaaS.Workload` has no parent to nest it in.
 *    Its agent contract names the service `NetworkAndCompute.CaaS.AzureContainerAppWorkload`.
 */
export const DELIVERY_MODEL_EXEMPT_OFFERS: ReadonlySet<string> = new Set([
  'NetworkAndCompute.CaaS.OpenshiftSecurityGroup',
  'NetworkAndCompute.CaaS.OpenshiftIpAddressPool',
  'NetworkAndCompute.CaaS.OpenshiftService',
  'Security.CaaS.Keycloak',
  'CustomWorkloads.PaaS.AzureContainerApp',
]);

/** The delivery models `abstractType` can be published under. Empty for a tag
 *  the table does not know. */
export const deliveryModelsOf = (abstractType: string): DeliveryModel[] =>
  Object.keys(
    CATALOGUE_COMPONENTS[abstractType]?.types ?? {},
  ) as DeliveryModel[];

/** The delivery model a blueprint component has: the one the author stated, else
 *  the component's default. `undefined` for a tag the table does not know. */
export const effectiveDeliveryModel = (
  abstractType: string,
  stated?: DeliveryModel,
): DeliveryModel | undefined =>
  stated ?? CATALOGUE_COMPONENTS[abstractType]?.default;

/** Refuse a delivery model the component has no catalogue component for. Called
 *  when the author states one, so the mistake shows at the factory call. */
export const assertDeliveryModelAvailable = (
  abstractType: string,
  model: DeliveryModel,
): void => {
  const known = deliveryModelsOf(abstractType);
  if (known.length > 0 && !known.includes(model)) {
    throw new Error(
      `Component '${abstractType}' has no ${model} delivery model in the catalogue ` +
        `(available: ${known.join(', ')}).`,
    );
  }
};

/** The catalogue component type a blueprint publishes for an abstract tag and
 *  its delivery model. A tag with no entry (`Unmanaged`, or a component outside
 *  this SDK) is unchanged. */
export const catalogueComponentType = (
  abstractType: string,
  stated?: DeliveryModel,
): string => {
  const entry = CATALOGUE_COMPONENTS[abstractType];
  if (!entry) {
    return abstractType;
  }
  const model = stated ?? entry.default;
  assertDeliveryModelAvailable(abstractType, model);
  return entry.types[model] ?? abstractType;
};
