// The last contract an agent published for this offer type: fractal-cloud-agents
// v8.31.0. No agent declares it since fractal-cloud-agents v8.48.0, so the
// generator no longer emits it. Frozen here only so the deprecated offer keeps
// its config type and key names; nothing checks parameters against it. Do not
// edit, and delete it with the offer.
import type {OfferContract} from '../contract/offer_contract';

export const Observability_CaaS_Jaeger = {
  offerType: 'Observability.CaaS.Jaeger',
  serviceTypes: [],
  declaredBy: [
    {
      agentId: 'fractal-cloud-agent-aws',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'AWS',
      parameterRules: [],
    },
    {
      agentId: 'fractal-cloud-agent-azure',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'Azure',
      parameterRules: [],
    },
    {
      agentId: 'fractal-cloud-agent-gcp',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'GCP',
      parameterRules: [],
    },
    {
      agentId: 'fractal-cloud-agent-oci',
      agentVersion: 'v8.31.0',
      contractSchemaVersion: '2.0',
      provider: 'OCI',
      parameterRules: [],
    },
  ],
  params: {
    /** Deprecated: id of the Kubernetes cluster component to deploy into. Used only when the component declares no dependency on a Kubernetes cluster; declare that dependency instead. */
    containerPlatform: {type: 'string', required: false},
    /** Kubernetes namespace Jaeger is deployed into, where its OpenSearch trace store places Jaeger's credentials Secret. When unset, the component id, which must then be a valid DNS-1123 label (at most 63 lowercase letters, digits and hyphens). */
    namespace: {
      type: 'string',
      required: false,
      derived: {note: 'defaults to the component id when absent'},
    },
    /** AWS region code the resource lives in (e.g. eu-west-1). When unset, the Live System's region parameter, else the region of the environment's AWS agent, else the agent's configured region. When none of these is known the component is refused: set the region on the environment's AWS agent, or region on the component. The legacy keys location and awsRegion are still read. */
    region: {
      type: 'string',
      required: false,
      agents: [
        'fractal-cloud-agent-aws',
        'fractal-cloud-agent-azure',
        'fractal-cloud-agent-gcp',
      ],
    },
    /** Retired: the storage class of the private Elasticsearch trace store Jaeger generated. Refused on a new Jaeger, warned on a deployed one. */
    storageClassName: {
      type: 'string',
      required: false,
      deprecated: {
        level: 'warn',
        note: 'Jaeger no longer generates a trace store: link it to a Storage.CaaS.OpenSearch component with {access: read-write} and size that component instead',
      },
    },
    /** Retired: the private Elasticsearch trace store Jaeger generated. Refused on a new Jaeger, warned on a deployed one. */
    storageSettings: {
      type: 'object',
      required: false,
      deprecated: {
        level: 'warn',
        note: 'Jaeger no longer generates a trace store: link it to a Storage.CaaS.OpenSearch component with {access: read-write} and size that component instead',
      },
    },
  },
} as const satisfies OfferContract;
