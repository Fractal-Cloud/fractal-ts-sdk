/**
 * The structural rules of a `Grafana` component's parameters (caas-k8s v2.0.0
 * runtime checks `grafana-admins` and `grafana-client-secret`): rules that
 * compare one parameter with another, which the contract cannot state. Every
 * single-parameter rule is the contract's and is not repeated here.
 * Internal: not re-exported from the model barrel.
 */
import type {LiveSystemComponent} from '../core';
import {isSecretRef} from '../secret';

/** The one variable Grafana reads from an environment secret. */
const CLIENT_SECRET_VARIABLE = 'GF_AUTH_GOOGLE_CLIENT_SECRET';

const refuse = (id: string, why: string): never => {
  throw new Error(`Live component '${id}': ${why}.`);
};

/** Every email in `admins` belongs to a domain in `allowedDomains`. */
const ensureAdminsAreAllowed = (self: LiveSystemComponent): void => {
  const admins: unknown = self.parameters.admins;
  const domains: unknown = self.parameters.allowedDomains;
  if (!Array.isArray(admins) || !Array.isArray(domains)) {
    return;
  }
  for (const admin of admins) {
    if (typeof admin !== 'string') {
      continue;
    }
    const domain = admin.slice(admin.lastIndexOf('@') + 1);
    if (!domains.includes(domain)) {
      refuse(
        self.id,
        `admin '${admin}' is not in an allowed domain: add '${domain}' to ` +
          'allowedDomains, or remove the admin',
      );
    }
  }
};

/**
 * `secretEnv` holds the client secret, and only it, as a reference to an
 * environment secret granted to the component. Names the variable, never the
 * value.
 */
const ensureSecretEnv = (self: LiveSystemComponent): void => {
  const secretEnv: unknown = self.parameters.secretEnv ?? {};
  if (
    typeof secretEnv !== 'object' ||
    secretEnv === null ||
    Array.isArray(secretEnv)
  ) {
    // Not a map, which the contract check already refuses.
    return;
  }
  if (!Object.hasOwn(secretEnv, CLIENT_SECRET_VARIABLE)) {
    refuse(
      self.id,
      `secretEnv sets no ${CLIENT_SECRET_VARIABLE}: Google sign-in needs the ` +
        "OAuth client secret; set it to secretRef('<shortName>') and grant it " +
        'with withEnvironmentSecrets([...])',
    );
  }
  const granted: unknown = self.parameters.environmentSecretShortNames;
  const grantedNames: readonly unknown[] = Array.isArray(granted)
    ? granted
    : [];
  for (const [variable, reference] of Object.entries(secretEnv)) {
    if (variable !== CLIENT_SECRET_VARIABLE) {
      refuse(
        self.id,
        `secretEnv '${variable}' is not read: Grafana takes only ${CLIENT_SECRET_VARIABLE}`,
      );
    }
    if (!isSecretRef(reference)) {
      refuse(
        self.id,
        `secretEnv '${variable}' is not an environment-secret reference: ` +
          "pass secretRef('<shortName>'), never the secret itself",
      );
    }
    if (!grantedNames.includes(reference.$envSecret)) {
      refuse(
        self.id,
        `secretEnv '${variable}' reads environment secret '${reference.$envSecret}', ` +
          'which is not granted: add it to withEnvironmentSecrets([...])',
      );
    }
  }
};

/** The structural rules of a `Grafana` component's own parameters. */
export const ensureGrafanaParameters = (self: LiveSystemComponent): void => {
  ensureAdminsAreAllowed(self);
  ensureSecretEnv(self);
};
