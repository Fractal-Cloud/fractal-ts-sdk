/**
 * Contracts shaped as the generator renders an offer that can access
 * environment secrets, and one that cannot, for the specs of
 * `withEnvironmentSecrets`. No released agent contract in the snapshot is
 * flagged yet.
 */
import type {OfferContract} from '../offer_contract';

export const Fixture_FaaS_SecretReader = {
  offerType: 'CustomWorkloads.FaaS.SecretReader',
  serviceTypes: ['CustomWorkloads.FaaS.SecretReader'],
  canAccessSecrets: true,
  declaredBy: [
    {
      agentId: 'fractal-cloud-agent-gcp',
      agentVersion: 'v0.0.0',
      contractSchemaVersion: '2.0',
      provider: 'GCP',
      parameterRules: [],
    },
  ],
  params: {
    environmentSecretShortNames: {type: 'array', required: false},
    handler: {type: 'string', required: false},
  },
} as const satisfies OfferContract;

export const Fixture_FaaS_Plain = {
  offerType: 'CustomWorkloads.FaaS.Plain',
  serviceTypes: ['CustomWorkloads.FaaS.Plain'],
  declaredBy: [
    {
      agentId: 'fractal-cloud-agent-gcp',
      agentVersion: 'v0.0.0',
      contractSchemaVersion: '2.0',
      provider: 'GCP',
      parameterRules: [],
    },
  ],
  params: {
    handler: {type: 'string', required: false},
  },
} as const satisfies OfferContract;
