/**
 * ci/credentials/credentials_from_ci.ts — a `providerCredentials` resolver for
 * one CI job, holding one cloud's credentials.
 *
 * Asked by `environments.deploy` right before each initialize request, it
 * - answers only for the job's own `cloud`: any other cloud is
 *   {@link ProviderCredentialsNotConfigured}, which the deploy skips with a notice;
 * - refuses (fails the deploy) an account, project, subscription or environment
 *   the configuration does not name, before minting anything;
 * - mints a fresh OIDC token per request, for the audience that cloud expects
 *   (or the CI's fixed one), or reads static secrets from CI variables;
 * - masks every token and secret through the CI reporter before returning it,
 *   and never puts one in a log line or an error message.
 */
import type {
  ProviderCredentials,
  ProviderCredentialsRequest,
  ProviderCredentialsResolver,
  ProviderType,
} from '../../environment/types';
import {formatEnvironmentId} from '../../environment/types';
import {ProviderCredentialsNotConfigured} from '../../environment/provider_credentials_not_configured';
import type {Ci} from '../ci';
import type {AwsCiCredentials} from './aws_ci_credentials';
import type {AwsOidcCiCredentials} from './aws_oidc_ci_credentials';
import type {AwsStaticCiCredentials} from './aws_static_ci_credentials';
import type {AzureCiCredentials} from './azure_ci_credentials';
import type {AzureStaticCiCredentials} from './azure_static_ci_credentials';
import type {CiCredentialsConfig} from './ci_credentials_config';
import type {CiCredentialsOptions} from './ci_credentials_options';
import type {CiValue} from './ci_value';
import type {GcpCiCredentials} from './gcp_ci_credentials';
import type {GcpOidcCiCredentials} from './gcp_oidc_ci_credentials';
import type {GcpStaticCiCredentials} from './gcp_static_ci_credentials';
import {
  assumeRoleWithWebIdentity,
  awsPartitionOf,
  getSessionToken,
  stsEndpoint,
} from './aws_sts';

const AWS_AUDIENCE = 'sts.amazonaws.com';
const AZURE_AUDIENCE = 'api://AzureADTokenExchange';
const DEFAULT_SESSION_SECONDS = 3600;
const ROLE_ARN_RE =
  /^arn:(aws(?:-cn|-us-gov)?):iam::(\d{12}):role\/[\w+=,.@/-]+$/;
const WIF_PROVIDER_RE =
  /^projects\/\d+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/;
const ACCOUNT_RE = /^\d{12}$/;
const JOB_CLOUDS: readonly ProviderType[] = ['AWS', 'GCP', 'AZURE'];

const list = <T>(v: T | readonly T[] | undefined): readonly T[] =>
  v === undefined ? [] : Array.isArray(v) ? (v as readonly T[]) : [v as T];

const isAwsOidc = (c: AwsCiCredentials): c is AwsOidcCiCredentials =>
  'roleArn' in c;
const isGcpOidc = (c: GcpCiCredentials): c is GcpOidcCiCredentials =>
  'workloadIdentityProvider' in c;
const isAzureStatic = (c: AzureCiCredentials): c is AzureStaticCiCredentials =>
  'clientSecret' in c;

/** The account of an AWS entry: the role's, or the static keys' declared one. */
const awsAccountOf = (c: AwsCiCredentials): string => {
  if (isAwsOidc(c)) {
    const m = ROLE_ARN_RE.exec(c.roleArn);
    if (m === null) {
      throw new Error(
        `credentialsFromCi: aws.roleArn '${c.roleArn}' is not an IAM role ARN (arn:aws:iam::<account>:role/<name>).`,
      );
    }
    return m[2];
  }
  if (!ACCOUNT_RE.test(c.accountId ?? '')) {
    throw new Error(
      'credentialsFromCi: static aws credentials need the 12-digit accountId they belong to.',
    );
  }
  return c.accountId;
};

const requireIds = (what: string, ids: readonly string[] | undefined): void => {
  if (ids === undefined || ids.length === 0 || ids.some(id => !id)) {
    throw new Error(
      `credentialsFromCi: ${what} must name the accounts these credentials serve; ` +
        'requests for any other are refused.',
    );
  }
};

/** Index entries by account, refusing an account claimed twice. */
const byAccount = <T>(
  cloud: string,
  entries: readonly T[],
  accountsOf: (e: T) => readonly string[],
): Map<string, T> => {
  const out = new Map<string, T>();
  for (const e of entries) {
    for (const account of accountsOf(e)) {
      const key = account.toLowerCase();
      if (out.has(key)) {
        throw new Error(
          `credentialsFromCi: ${cloud} account '${account}' is configured more than once.`,
        );
      }
      out.set(key, e);
    }
  }
  return out;
};

const jobCloud = (config: CiCredentialsConfig): ProviderType => {
  if (config.cloud === undefined || config.cloud.trim() === '') {
    throw new Error(
      "credentialsFromCi: no cloud for this job; set 'cloud' to AWS, GCP or AZURE (e.g. from a job variable).",
    );
  }
  const raw = config.cloud.trim();
  const cloud = raw.toUpperCase() as ProviderType;
  if (!JOB_CLOUDS.includes(cloud)) {
    throw new Error(
      `credentialsFromCi: cloud '${raw}' is not one this job can hold; use AWS, GCP or AZURE.`,
    );
  }
  const key = cloud.toLowerCase() as 'aws' | 'gcp' | 'azure';
  if (list(config[key]).length === 0) {
    throw new Error(
      `credentialsFromCi: this job holds cloud '${cloud}', but there is no ${key} configuration.`,
    );
  }
  return cloud;
};

const SESSION_NAME_UNSAFE = /[^\w+=,.@-]/g;

export const credentialsFromCi = (
  ci: Ci,
  config: CiCredentialsConfig,
  options: CiCredentialsOptions = {},
): ProviderCredentialsResolver => {
  const cloud = jobCloud(config);
  const fetchFn = options.fetch ?? fetch;
  // Validated up front, so a configuration mistake fails before any request.
  const aws = byAccount('AWS', list(config.aws), e => [awsAccountOf(e)]);
  const gcp = byAccount('GCP', list(config.gcp), e => {
    requireIds('gcp.projectIds', e.projectIds);
    if (isGcpOidc(e) && !WIF_PROVIDER_RE.test(e.workloadIdentityProvider)) {
      throw new Error(
        `credentialsFromCi: gcp.workloadIdentityProvider '${e.workloadIdentityProvider}' is not ` +
          'projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>.',
      );
    }
    return e.projectIds;
  });
  const azure = byAccount('Azure', list(config.azure), e => {
    requireIds('azure.subscriptionIds', e.subscriptionIds);
    return e.subscriptionIds;
  });
  // An entry with slashes is a full id (`Type/ownerId/shortName`); one without
  // matches the short name under any owner.
  const environments =
    config.environments === undefined
      ? undefined
      : new Set(config.environments);
  const allowedEnvironment = (request: ProviderCredentialsRequest): boolean =>
    environments === undefined ||
    environments.has(formatEnvironmentId(request.environment)) ||
    environments.has(request.environment.shortName);

  const mask = (value: string): string => {
    ci.reporter.mask(value);
    return value;
  };

  const token = async (cloudDefault: string, audience?: string) =>
    mask(
      await ci.identity.idToken(
        audience ?? ci.identity.fixedAudience ?? cloudDefault,
      ),
    );

  /**
   * A static value. A missing one fails the deploy: this job declared it holds
   * this cloud, so a secret it was not given is a mistake in the job, not a
   * cloud left to another job.
   */
  const value = (v: CiValue, what: string): string => {
    const read = typeof v === 'string' ? v : ci.variable(v.ciSecret);
    if (read === undefined || read.length === 0) {
      throw new Error(
        typeof v === 'string'
          ? `${what} is empty.`
          : `The CI variable ${v.ciSecret} (${what}) is not set for this job: map the secret into the step's environment.`,
      );
    }
    return mask(read);
  };

  const refused = (request: ProviderCredentialsRequest, what: string) =>
    new Error(
      `${what} '${request.accountId}' is not configured for this job (environment ` +
        `'${formatEnvironmentId(request.environment)}'); refusing to hand out credentials for it.`,
    );

  const forAws = async (
    request: ProviderCredentialsRequest,
  ): Promise<ProviderCredentials> => {
    const entry = aws.get(request.accountId.toLowerCase());
    if (entry === undefined) {
      throw refused(request, 'AWS account');
    }
    // The region names the STS host a token or key signature is sent to.
    stsEndpoint(request.region);
    if (isAwsOidc(entry)) {
      const partition = ROLE_ARN_RE.exec(entry.roleArn)?.[1] ?? 'aws';
      if (awsPartitionOf(request.region) !== partition) {
        throw new Error(
          `Region '${request.region}' is outside the ${partition} partition of role '${entry.roleArn}'.`,
        );
      }
    }
    if (isAwsOidc(entry)) {
      const webIdentityToken = await token(AWS_AUDIENCE, entry.audience);
      if (entry.exchange === 'control-plane') {
        return {aws: {roleArn: entry.roleArn, webIdentityToken}};
      }
      const session = await assumeRoleWithWebIdentity(
        {
          roleArn: entry.roleArn,
          webIdentityToken,
          sessionName: `fractal-${request.environment.shortName}`
            .replace(SESSION_NAME_UNSAFE, '-')
            .slice(0, 64),
          durationSeconds:
            entry.sessionDurationSeconds ?? DEFAULT_SESSION_SECONDS,
          region: request.region,
        },
        fetchFn,
      );
      return {aws: maskSession(session)};
    }
    return {aws: await staticAws(entry, request.region)};
  };

  const maskSession = (s: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  }) => ({
    accessKeyId: mask(s.accessKeyId),
    secretAccessKey: mask(s.secretAccessKey),
    sessionToken: mask(s.sessionToken),
  });

  const staticAws = async (entry: AwsStaticCiCredentials, region: string) => {
    const accessKeyId = value(entry.accessKeyId, 'aws.accessKeyId');
    const secretAccessKey = value(entry.secretAccessKey, 'aws.secretAccessKey');
    if (entry.sessionToken !== undefined) {
      const sessionToken = value(entry.sessionToken, 'aws.sessionToken');
      return {accessKeyId, secretAccessKey, sessionToken};
    }
    // Long-lived keys: the control plane honors only a three-part session, so
    // the keys are exchanged for a short one and never sent themselves.
    const session = await getSessionToken(
      {
        accessKeyId,
        secretAccessKey,
        durationSeconds:
          entry.sessionDurationSeconds ?? DEFAULT_SESSION_SECONDS,
        region,
      },
      fetchFn,
    );
    return maskSession(session);
  };

  const forGcp = async (
    request: ProviderCredentialsRequest,
  ): Promise<ProviderCredentials> => {
    const entry = gcp.get(request.accountId.toLowerCase());
    if (entry === undefined) {
      throw refused(request, 'GCP project');
    }
    if (isGcpOidc(entry)) {
      return {
        gcp: {
          serviceAccountEmail: entry.serviceAccountEmail,
          workloadIdentityProvider: entry.workloadIdentityProvider,
          federatedToken: await token(
            `https://iam.googleapis.com/${entry.workloadIdentityProvider}`,
            entry.audience,
          ),
        },
      };
    }
    return {gcp: staticGcp(entry)};
  };

  const staticGcp = (entry: GcpStaticCiCredentials) => {
    const what =
      typeof entry.serviceAccountKey === 'string'
        ? 'gcp.serviceAccountKey'
        : `CI variable ${entry.serviceAccountKey.ciSecret}`;
    const key = value(entry.serviceAccountKey, 'gcp.serviceAccountKey');
    let parsed: {client_email?: unknown; private_key?: unknown};
    try {
      parsed = JSON.parse(key) as typeof parsed;
    } catch {
      parsed = {};
    }
    if (typeof parsed.client_email !== 'string' || parsed.client_email === '') {
      throw new Error(
        `${what} is not a service-account key (JSON with a client_email).`,
      );
    }
    if (typeof parsed.private_key === 'string') {
      // A key is multi-line: mask it whole and line by line, so a log that
      // splits it still shows none of it.
      mask(parsed.private_key);
      for (const line of parsed.private_key.split('\n')) {
        if (line.length >= 8 && !line.startsWith('-----')) {
          mask(line);
        }
      }
    }
    return {
      serviceAccountEmail: parsed.client_email,
      serviceAccountCredentials: key,
    };
  };

  const forAzure = async (
    request: ProviderCredentialsRequest,
  ): Promise<ProviderCredentials> => {
    const entry = azure.get(request.accountId.toLowerCase());
    if (entry === undefined) {
      throw refused(request, 'Azure subscription');
    }
    if (isAzureStatic(entry)) {
      return {
        azure: {
          spClientId: entry.clientId,
          spClientSecret: value(entry.clientSecret, 'azure.clientSecret'),
        },
      };
    }
    return {
      azure: {
        clientId: entry.clientId,
        federatedToken: await token(AZURE_AUDIENCE, entry.audience),
      },
    };
  };

  return async request => {
    if (request.provider !== cloud) {
      throw new ProviderCredentialsNotConfigured(
        request.provider,
        request.environment,
        `this job holds ${cloud} credentials only; the ${request.provider} job initializes it`,
      );
    }
    if (!allowedEnvironment(request)) {
      throw new Error(
        `environment '${request.environment.shortName}' is not configured for this job; ` +
          'refusing to hand out credentials for it.',
      );
    }
    switch (request.provider) {
      case 'AWS':
        return forAws(request);
      case 'GCP':
        return forGcp(request);
      default:
        return forAzure(request);
    }
  };
};
