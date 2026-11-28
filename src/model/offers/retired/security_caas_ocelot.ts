// The last contract an agent published for this offer type: fractal-cloud-agents
// v8.31.0. No agent declares it since fractal-cloud-agents v8.48.0, so the
// generator no longer emits it. Frozen here only so the deprecated offer keeps
// its config type and key names; nothing checks parameters against it. Do not
// edit, and delete it with the offer.
import type {OfferContract} from '../contract/offer_contract';

export const Security_CaaS_Ocelot = {
  offerType: 'Security.CaaS.Ocelot',
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
    /** Lifetime, in seconds, of the session cookie Ocelot issues. When unset, 900 (15 minutes). */
    cookieMaxAgeSec: {type: 'integer', required: false, default: 900},
    /** Origins (scheme://host[:port]) allowed to call Ocelot cross-origin, passed to it as one comma-separated list. When unset, none. */
    corsOrigins: {type: 'array', required: false, default: []},
    /** Host name, on the Live System's Traefik gateway, whose /ocelot/ route Ocelot serves. Required to create: a new Ocelot is refused without it; a deployed one is kept as it runs, with a warning. */
    host: {type: 'string', required: false},
    /** Kubernetes namespace Ocelot is deployed into. When unset, the component id, which must then be a valid DNS-1123 label (at most 63 lowercase letters, digits and hyphens). */
    namespace: {
      type: 'string',
      required: false,
      derived: {note: 'defaults to the component id when absent'},
    },
    /** Deprecated and ignored: it chose the paths an Ambassador Edge Stack FilterPolicy guarded. Behind Traefik a route is authenticated by referencing Ocelot's ForwardAuth middleware (published as forwardAuthMiddlewareName / forwardAuthMiddlewareNamespace). Leave it unset. */
    pathPrefix: {
      type: 'string',
      required: false,
      deprecated: {
        level: 'warn',
        note: "ignored: a route is authenticated by referencing Ocelot's ForwardAuth middleware",
      },
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
    /** Cloud roles granted to Ocelot's workload identity, each a map {name, scope, roleType}; roleType is BuiltInRole (when unset), CustomRole, AppRoleAssignment, OcelotRole or CosmosDbSqlRole. When unset, no extra roles. */
    roles: {type: 'array', required: false, default: []},
  },
} as const satisfies OfferContract;
