import type {Observability_CaaS_SqsExporter} from './generated/observability';
import type {ContractConfig} from './contract/contract_config';

/**
 * Vendor knobs of the `SqsExporter` offer (`Observability.CaaS.SqsExporter`):
 * the caas-k8s agent's published contract, its comma-separated lists presented
 * as lists. The monitoring component's neutral `retentionDays` and
 * `scrapeInterval` are not keys of this contract.
 */
export type SqsExporterConfig = ContractConfig<
  typeof Observability_CaaS_SqsExporter,
  never,
  {
    /**
     * Queues watched besides the linked `AwsSqsQueue` components, as
     * `https://sqs.<region>.amazonaws.com/<account>/<name>` URLs. Sent
     * comma-separated.
     */
    queueUrls?: readonly string[];
    /**
     * Exporter image with the exporter as its entrypoint. Unset (the SDK sends
     * nothing): the agent's own multi-arch (amd64 and arm64) release image, run
     * as `sqs-exporter`. That image is private on Docker Hub: give the namespace a
     * pull secret (`imagePullSecrets`) or set this to a mirror.
     */
    image?: string;
    /** Secrets in the namespace to pull the image with. Sent comma-separated. */
    imagePullSecrets?: readonly string[];
    /** Pod nodeSelector, a non-empty label map. Unset: none. */
    nodeSelector?: Readonly<Record<string, string>>;
  }
>;
