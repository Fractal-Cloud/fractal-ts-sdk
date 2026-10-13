/**
 * offers/workload_link_env.ts — the environment variables a Kubernetes
 * workload's links bind, as the caas-k8s agent derives them
 * (`internal/workload/bindings.go`).
 *
 * A link to an SNS topic binds `TOPIC_ARN_<S>`, to an SQS queue
 * `QUEUE_URL_<S>`, to an S3 bucket `BUCKET_URI_<S>`, where `<S>` is the link's
 * `envPrefix` or else the target's id, upper-snake-cased. A link to an RDS
 * PostgreSQL database binds `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`,
 * `DB_AUTH_MODE` and `DB_PASSWORD_REF`, prefixed by `<envPrefix>_` only when
 * the link sets one. The agent fails a workload two of whose links bind one
 * name, or one of whose link-bound names is also in `env` or `secretEnv`.
 * Internal.
 */
import type {ComponentValidator} from './component_validator';
import {refuseComponent, settingText} from './cross_component_rules';

const SNS_TOPIC = 'Messaging.PaaS.AwsSnsTopic';
const SQS_QUEUE = 'Messaging.PaaS.AwsSqsQueue';
const S3_BUCKETS = ['Storage.PaaS.AwsS3', 'Storage.PaaS.S3'];
const RDS_POSTGRES_DATABASE = 'Storage.PaaS.AwsRdsPostgresDatabase';
const DATABASE_VARIABLES = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USERNAME',
  'DB_AUTH_MODE',
  'DB_PASSWORD_REF',
];

/** An id upper-snake-cased into a variable name, as the agent's `envSuffix`. */
const envSuffix = (id: string): string => {
  const out = id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return /^[0-9]/.test(out) ? `_${out}` : out;
};

/** The names a workload declares itself in `env` (object or legacy list) and `secretEnv`. */
const declaredNames = (
  parameters: Readonly<Record<string, unknown>>,
): Map<string, string> => {
  const names = new Map<string, string>();
  const env = parameters.env;
  if (Array.isArray(env)) {
    for (const entry of env) {
      if (typeof entry === 'object' && entry !== null) {
        const name = (entry as Record<string, unknown>).name;
        if (typeof name === 'string' && name !== '') {
          names.set(name, 'env');
        }
      }
    }
  } else if (typeof env === 'object' && env !== null) {
    for (const name of Object.keys(env)) {
      names.set(name, 'env');
    }
  }
  const secretEnv = parameters.secretEnv;
  if (typeof secretEnv === 'object' && secretEnv !== null) {
    for (const name of Object.keys(secretEnv)) {
      names.set(name, 'secretEnv');
    }
  }
  return names;
};

/** The variables a workload's links bind, with the target binding each. */
export const workloadLinkEnvIsUnambiguous: ComponentValidator = (self, all) => {
  // A workload deployed from a Helm chart or a manifest binds nothing from links.
  const isSet = (v: unknown): boolean =>
    v !== undefined && v !== null && String(v).trim() !== '';
  if (isSet(self.parameters.helmChart) || isSet(self.parameters.manifestUri)) {
    return;
  }
  const bound = new Map<string, string>();
  const declared = declaredNames(self.parameters);
  const bind = (targetId: string, name: string): void => {
    const previous = bound.get(name);
    if (previous !== undefined) {
      refuseComponent(
        self,
        `binds environment variable ${name} through its links to both '${previous}' and ` +
          `'${targetId}': give one of the two links an envPrefix`,
      );
    }
    const source = declared.get(name);
    if (source !== undefined) {
      refuseComponent(
        self,
        `sets environment variable ${name} both through its link to '${targetId}' and in ` +
          `${source}: remove it from ${source}, or give the link an envPrefix`,
      );
    }
    bound.set(name, targetId);
  };
  for (const link of self.links) {
    const target = all.find(c => c.id === link.componentId);
    if (target === undefined) {
      continue;
    }
    const prefix = settingText(link.settings, 'envPrefix');
    const suffix = envSuffix(prefix !== '' ? prefix : target.id);
    const accessBound = [SNS_TOPIC, SQS_QUEUE, ...S3_BUCKETS].includes(
      target.type,
    );
    if (accessBound && settingText(link.settings, 'access') === '') {
      continue;
    }
    if (target.type === SNS_TOPIC) {
      bind(target.id, `TOPIC_ARN_${suffix}`);
    } else if (target.type === SQS_QUEUE) {
      bind(target.id, `QUEUE_URL_${suffix}`);
    } else if (S3_BUCKETS.includes(target.type)) {
      bind(target.id, `BUCKET_URI_${suffix}`);
    } else if (target.type === RDS_POSTGRES_DATABASE) {
      const head = prefix !== '' ? `${envSuffix(prefix)}_` : '';
      for (const name of DATABASE_VARIABLES) {
        bind(target.id, `${head}${name}`);
      }
    }
  }
};
