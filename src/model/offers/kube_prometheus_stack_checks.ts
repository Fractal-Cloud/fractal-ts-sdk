/**
 * The structural rules of a `KubePrometheusStack`'s parameters that caas-k8s
 * v2.0.0 added, as the agent refuses them (runtime checks `kps-secret-env` and
 * `kps-bundled-grafana`). Internal: not re-exported from the model barrel.
 */
import type {LiveSystemComponent} from '../core';
import type {KubePrometheusStackConfig} from './kube_prometheus_stack_config';

const refuse = (id: string, why: string): never => {
  throw new Error(`Live component '${id}': ${why}.`);
};

/**
 * The stack reads no environment secrets. `secretEnv` is no longer a contract
 * key, so only a config typed around the SDK can carry it; the agent refuses
 * it, and so does this, by name and never by value.
 */
const ensureNoSecretEnv = (self: LiveSystemComponent): void => {
  if (self.parameters.secretEnv !== undefined) {
    refuse(
      self.id,
      'the stack reads no environment secrets: secretEnv must be unset. Google ' +
        "sign-in is an Observability.CaaS.Grafana component's: remove secretEnv, " +
        'and use the Grafana offer with bundledGrafana false',
    );
  }
};

/** A key only the bundled Grafana reads, set while it is off. */
const refuseWithoutBundledGrafana = (id: string, key: string): never =>
  refuse(
    id,
    `bundledGrafana is false, so the stack installs no Grafana: ${key} is the ` +
      "bundled Grafana's; remove it or set bundledGrafana to true",
  );

/**
 * With `bundledGrafana: false` the stack installs no Grafana, so `lokiUrl`,
 * `tempoUrl` and `values.grafana` are refused by name rather than dropped.
 */
const ensureBundledGrafanaKeys = (
  id: string,
  config: KubePrometheusStackConfig,
): void => {
  if (config.bundledGrafana !== false) {
    return;
  }
  for (const key of ['lokiUrl', 'tempoUrl'] as const) {
    if (config[key] !== undefined) {
      refuseWithoutBundledGrafana(id, key);
    }
  }
  const values: unknown = config.values;
  if (
    typeof values === 'object' &&
    values !== null &&
    Object.hasOwn(values, 'grafana')
  ) {
    refuseWithoutBundledGrafana(id, 'values.grafana');
  }
};

/** Every v2.0.0 structural rule of the stack. */
export const ensureKubePrometheusStackParameters = (
  self: LiveSystemComponent,
  config: KubePrometheusStackConfig,
): void => {
  ensureNoSecretEnv(self);
  ensureBundledGrafanaKeys(self.id, config);
};
