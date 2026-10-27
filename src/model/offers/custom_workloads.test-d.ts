/**
 * Type-level assertions for the `K8sWorkload` config (see storage.test-d.ts
 * for why these are not in a `.test.ts`).
 */
import {K8sWorkload} from './custom_workloads';

K8sWorkload({resourceLimits: {cpu: '1', memory: '1Gi'}});
// Deprecated since caas-k8s v1.12.0, but still accepted and still sent.
K8sWorkload({cpuLimit: '1', memoryLimit: '1Gi'});
K8sWorkload({memoryLimit: '1Gi', resourceLimits: {cpu: '2'}});
// @ts-expect-error a limit is a Kubernetes quantity string.
K8sWorkload({cpuLimit: 1});
// @ts-expect-error the request comes from the Workload (`withCpuRequest`), not the offer.
K8sWorkload({cpuRequest: '100m'});
// caas-k8s v1.13.0 flags the workload as able to read environment secrets.
K8sWorkload({}).withEnvironmentSecrets(['db-password']);
