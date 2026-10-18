/**
 * Type-level assertions that the parameter-key drifts the SDK used to ship
 * cannot be written any more, checked by `npm run typecheck` (see
 * storage.test-d.ts for why these are not in a `.test.ts`). Every offer config
 * and every vendor key a translation writes comes from the agents' published
 * contracts (docs/offer-contracts.md).
 */
import {contractKey} from './contract_key';
import type {ContractConfig} from './contract_config';
import {NetworkAndCompute_IaaS_AwsLb} from '../generated/network_and_compute';
import {
  AwsLb,
  AzureNsg,
  OciInstance,
  OciSubnet,
  OciVcn,
} from '../network_and_compute';
import {AzureApiManagement, GcpApiGateway} from '../api_management';
import {EcsService} from '../custom_workloads';
import {AwsRoute53HostedZone} from '../dns';

// A translation names the agent's key through the contract: `lbScheme` is one…
contractKey(NetworkAndCompute_IaaS_AwsLb, 'lbScheme');
// @ts-expect-error …and the neutral `scheme` the SDK once shipped is not.
contractKey(NetworkAndCompute_IaaS_AwsLb, 'scheme');

// OCI reads the availability domain as `availabilityZone`, and no `region`.
OciSubnet({availabilityZone: 'Uocm:EU-FRANKFURT-1-AD-1'});
// @ts-expect-error `availabilityDomain` is not a key of the OCI subnet contract.
OciSubnet({availabilityDomain: 'Uocm:EU-FRANKFURT-1-AD-1'});
// @ts-expect-error the OCI agent reads no per-component `region`.
OciVcn({region: 'eu-frankfurt-1'});
// The public key is the neutral `withPublicSSHKey`, sent as the contract's `keyName`.
OciInstance({shape: 'VM.Standard.E4.Flex'});

// A key a neutral guardrail fills is not offered twice: `withScheme` owns it.
// @ts-expect-error `lbScheme` comes from `LoadBalancer.withScheme`.
AwsLb({lbScheme: 'internal'});

// Keys the SDK offered that the agents never read.
// The Azure NSG contract declares `resourceGroup` since fractal-cloud-agents v8.25.2.
AzureNsg({resourceGroup: 'rg'});
// @ts-expect-error the API Management contract names its SKU `skuName`.
AzureApiManagement({sku: 'Developer'});
AzureApiManagement({skuName: 'Developer'});
// EcsService emits the real ECS service and task definition, whose contracts
// declare `launchType`; the image is the Workload's withImage, not config.
EcsService({launchType: 'FARGATE'});
// @ts-expect-error `containerImage` is filled by the Workload's withImage.
EcsService({containerImage: 'registry/app:1'});

// `apiConfig` is optional in the GCP agent's contract (v8.25.10): the agent
// refuses a new gateway without it, a deployed one keeps its config.
GcpApiGateway({apiConfig: 'openapi: 3.0.0'});
GcpApiGateway({});

// The Route 53 contract (fractal-cloud-agents v8.25.10) still declares both.
AwsRoute53HostedZone({
  adoptExisting: true,
  comment: 'managed by Fractal Cloud',
});
// @ts-expect-error a guardrail key is the DnsZone setters', not config.
AwsRoute53HostedZone({recordManagement: 'lax'});

/** An override may only re-type a key the contract declares. */
export type LbConfigWithScheme = ContractConfig<
  typeof NetworkAndCompute_IaaS_AwsLb,
  never,
  // @ts-expect-error `scheme` is not a key of the AWS load balancer contract.
  {scheme?: string}
>;
