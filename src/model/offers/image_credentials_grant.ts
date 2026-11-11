import type {LiveSystemComponent} from '../core';
import {contractKeys} from './contract/contract_keys';
import {CustomWorkloads_CaaS_KubernetesWorkload} from './generated/custom_workloads';

const KEY = contractKeys(CustomWorkloads_CaaS_KubernetesWorkload);

/**
 * Refuse a Kubernetes workload whose `containerImageCredentials` is not one of
 * the short names in its own `environmentSecretShortNames`.
 *
 * The parameter names the environment secret holding a Docker config JSON, so
 * pasting the credential itself is a natural mistake, and it would be stored on
 * the Live System in plaintext. Requiring the value to be a granted short name
 * closes that path: a credential would have to be pasted into the grant list
 * too. The message names the key, never the value.
 *
 * SDK-side on purpose: the agent contract's rule vocabulary (aria-spec
 * `ParameterRuleKind`: requiredIf, exactlyOneOf, anyOf, allOrNone,
 * lessThanOrEqual, branches) compares a key only with literal values
 * (`equals`, `in`, `notIn`, `present`), never with another key's value, so it
 * cannot express "one of environmentSecretShortNames". Move this to the
 * contract once the vocabulary can.
 */
export const ensureImageCredentialsGranted = (
  self: LiveSystemComponent,
): void => {
  const credentials = self.parameters[KEY.containerImageCredentials];
  if (credentials === undefined) {
    return;
  }
  const granted = self.parameters[KEY.environmentSecretShortNames];
  if (
    typeof credentials !== 'string' ||
    !Array.isArray(granted) ||
    !granted.includes(credentials)
  ) {
    throw new Error(
      `Live component '${self.id}': ${KEY.containerImageCredentials} must be the ` +
        'short name of an environment secret granted to the workload in ' +
        `${KEY.environmentSecretShortNames} (withEnvironmentSecrets); the value is withheld.`,
    );
  }
};
