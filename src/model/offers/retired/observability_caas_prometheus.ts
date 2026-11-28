// The last contract an agent published for this offer type: fractal-cloud-agents
// v8.31.0. No agent declares it since fractal-cloud-agents v8.48.0, so the
// generator no longer emits it. Frozen here only so the deprecated offer keeps
// its config type and key names; nothing checks parameters against it. Do not
// edit, and delete it with the offer.
import type {OfferContract} from '../contract/offer_contract';

export const Observability_CaaS_Prometheus = {
  offerType: 'Observability.CaaS.Prometheus',
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
    /** Host name or address, without scheme or path, the stack is reached through: its external URLs become https://<host>/prometheus/, https://<host>/alertmanager/ and https://<host>/grafana/, and they are published as its outputs. When unset, the address of the API gateway the component links to, once it can route; with neither, the stack is reachable in-cluster only and publishes its in-cluster addresses. */
    apiGatewayUrl: {
      type: 'string',
      required: false,
      derived: {
        note: 'the address of the API gateway the component links to, when it can route',
      },
    },
    /** Deprecated: id of the Kubernetes cluster component to install into. Used only when the component declares no dependency on a Kubernetes cluster; declare that dependency instead. */
    containerPlatform: {type: 'string', required: false},
    /** Kubernetes namespace the Prometheus, Alertmanager and Grafana stack is installed into. When unset, the component id, which must then be a valid DNS-1123 label (at most 63 lowercase letters, digits and hyphens). */
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
  },
} as const satisfies OfferContract;
