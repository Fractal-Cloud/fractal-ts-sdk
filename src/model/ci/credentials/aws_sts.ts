/**
 * ci/credentials/aws_sts.ts — the two STS calls that turn what a CI holds into
 * the three-part session the control plane honors:
 *
 * - `AssumeRoleWithWebIdentity`, an unsigned call carrying the CI's OIDC token;
 * - `GetSessionToken`, signed with long-lived access keys.
 *
 * Errors name STS's code and message with every credential redacted; the token
 * and keys are never part of one.
 */
import {redactSecrets} from '../../api-error';
import type {AwsSession} from './aws_session';
import {signAwsRequest} from './aws_sigv4';

const STS_VERSION = '2011-06-15';

/** The regional STS endpoint (`cn-*` regions live in the China partition). */
export const stsEndpoint = (region: string): string =>
  region.startsWith('cn-')
    ? `https://sts.${region}.amazonaws.com.cn/`
    : `https://sts.${region}.amazonaws.com/`;

const xmlField = (xml: string, name: string): string | undefined =>
  new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml)?.[1];

const field = (o: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>(
    (at, key) =>
      at !== null && typeof at === 'object'
        ? (at as Record<string, unknown>)[key]
        : undefined,
    o,
  );

/** STS answers JSON when asked to, and XML otherwise: read either. */
const readAnswer = async (
  res: Response,
  action: string,
): Promise<{session?: AwsSession; error?: string}> => {
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  const pick = (name: string): string | undefined => {
    const fromJson =
      json === undefined
        ? undefined
        : field(
            json,
            `${action}Response`,
            `${action}Result`,
            'Credentials',
            name,
          );
    return typeof fromJson === 'string' ? fromJson : xmlField(text, name);
  };
  if (res.ok) {
    const accessKeyId = pick('AccessKeyId');
    const secretAccessKey = pick('SecretAccessKey');
    const sessionToken = pick('SessionToken');
    if (accessKeyId && secretAccessKey && sessionToken) {
      return {session: {accessKeyId, secretAccessKey, sessionToken}};
    }
    return {error: 'the answer carries no credentials'};
  }
  const code =
    (field(json, 'Error', 'Code') as string | undefined) ??
    xmlField(text, 'Code') ??
    `HTTP ${res.status}`;
  const message =
    (field(json, 'Error', 'Message') as string | undefined) ??
    xmlField(text, 'Message') ??
    '';
  return {error: message.length > 0 ? `${code}: ${message}` : code};
};

const call = async (
  action: string,
  region: string,
  params: Record<string, string>,
  secrets: readonly string[],
  fetchFn: typeof fetch,
  sign?: {accessKeyId: string; secretAccessKey: string},
): Promise<AwsSession> => {
  const url = stsEndpoint(region);
  const body = new URLSearchParams({
    Action: action,
    Version: STS_VERSION,
    ...params,
  }).toString();
  const base = {
    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    accept: 'application/json',
  };
  const headers =
    sign === undefined
      ? base
      : signAwsRequest({
          method: 'POST',
          url,
          headers: base,
          body,
          region,
          service: 'sts',
          ...sign,
        });
  let res: Response;
  try {
    res = await fetchFn(url, {method: 'POST', headers, body});
  } catch (err) {
    throw new Error(
      `sts:${action} could not reach ${url}: ${redactSecrets(err instanceof Error ? err.message : String(err), secrets)}`,
    );
  }
  const answer = await readAnswer(res, action);
  if (answer.session === undefined) {
    throw new Error(
      `sts:${action} failed: ${redactSecrets(answer.error ?? 'unknown error', secrets)}`,
    );
  }
  return answer.session;
};

export const assumeRoleWithWebIdentity = (
  args: {
    roleArn: string;
    webIdentityToken: string;
    sessionName: string;
    durationSeconds: number;
    region: string;
  },
  fetchFn: typeof fetch,
): Promise<AwsSession> =>
  call(
    'AssumeRoleWithWebIdentity',
    args.region,
    {
      RoleArn: args.roleArn,
      RoleSessionName: args.sessionName,
      WebIdentityToken: args.webIdentityToken,
      DurationSeconds: String(args.durationSeconds),
    },
    [args.webIdentityToken],
    fetchFn,
  );

export const getSessionToken = (
  args: {
    accessKeyId: string;
    secretAccessKey: string;
    durationSeconds: number;
    region: string;
  },
  fetchFn: typeof fetch,
): Promise<AwsSession> =>
  call(
    'GetSessionToken',
    args.region,
    {DurationSeconds: String(args.durationSeconds)},
    [args.secretAccessKey],
    fetchFn,
    {accessKeyId: args.accessKeyId, secretAccessKey: args.secretAccessKey},
  );
