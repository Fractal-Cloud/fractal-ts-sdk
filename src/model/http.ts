/**
 * http.ts — shared HTTP contract for the Fractal Cloud API.
 *
 * Base URL, credential headers, the wait-mode log format (see ~/Projects/CLAUDE.md
 * "SDK — Wait Mode Log Format"), and small timing helpers. Reused by both the
 * LiveSystem deploy service (`service.ts`) and the Environment service
 * (`environment/service.ts`) so there is exactly one HTTP contract.
 */

import type {OwnerRef, Version} from './core';

export const FRACTAL_API_URL = 'https://api.fractal.cloud';
export const CLIENT_ID_HEADER = 'X-ClientID';
export const CLIENT_SECRET_HEADER = 'X-ClientSecret';

export type Credentials = {clientId: string; clientSecret: string};

/**
 * Everything an API call needs beyond its own payload: who is calling, and which
 * control plane. Held once by the client (see client.ts) rather than passed to
 * each operation.
 */
/**
 * A secret value the SDK sent, with the label used in its redaction marker.
 * Declared here rather than in api-error.ts because {@link ApiConfig} carries it
 * and api-error.ts already imports from this module.
 */
export type LabeledSecret = {label: string; value: string};

export type ApiConfig = Credentials & {
  /** Override the control-plane base URL (staging, a local control plane, …).
   *  Defaults to the production API. */
  baseUrl?: string;
  /**
   * Extra secret values that must never appear in an error this SDK throws, on TOP
   * of the client credentials — the provider credentials, environment secret values
   * and CI/CD private keys a single `environments.deploy` sends.
   *
   * Scoped to the whole OPERATION on purpose, not to the one request that carried
   * the value. A credential submitted to `initializer/…/initialize` can be quoted
   * back by a LATER call in the same flow: the initialization-STATUS poll is a
   * natural place for a server to report "the credentials you provided are invalid:
   * <value>", and that request sends no credential of its own. Measured — scoping
   * the set per-call-site let exactly that case print an Azure SP secret. Attaching
   * it to the config covers every request the operation makes.
   *
   * Populated internally by `deployEnvironment`; callers need not set it.
   */
  extraSecrets?: readonly LabeledSecret[];
};

/** Absolute URL for an API path, honoring a `baseUrl` override. A trailing slash
 *  on the override is dropped so it never produces a doubled separator. */
export const apiUrl = (cfg: ApiConfig, path: string): string =>
  `${(cfg.baseUrl ?? FRACTAL_API_URL).replace(/\/+$/, '')}${path}`;

export const authHeaders = (c: Credentials): Record<string, string> => ({
  [CLIENT_ID_HEADER]: c.clientId,
  [CLIENT_SECRET_HEADER]: c.clientSecret,
});

// ── owner-scoped id formatting (matches the Fractal Cloud API contract) ───────
/**
 * Percent-encode one path segment. Ids reaching these builders are authored in
 * code, not by end users, but nothing validates them — an id containing `/` or
 * `..` would otherwise rewrite the request path. Well-formed ids (kebab-case
 * names, UUIDs, dotted versions) are unchanged by this.
 */
const segment = (value: string): string => encodeURIComponent(value);

/** `<ownerType>/<ownerId>/<name>` — the Bounded Context prefix every resource id
 *  carries. (The API still calls a Bounded Context a "resource group".) */
export const bcString = (bc: OwnerRef): string =>
  [
    segment(bc.ownerType ?? 'Personal'),
    segment(bc.ownerId ?? ''),
    segment(bc.name ?? ''),
  ].join('/');

/** `<major>.<minor>.<patch>` — the single source of truth for the wire format of
 *  a Fractal version. */
export const versionString = (v: Version): string =>
  `${v.major}.${v.minor}.${v.patch}`;

/** Percent-encode a single, caller-supplied path segment (a fractal or live
 *  system name). Exported so every URL builder hardens the same way. */
export const pathSegment = segment;

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const elapsedSec = (startMs: number): string =>
  `${Math.round((Date.now() - startMs) / 1000)}s`;

export type LogLevel = 'INFO' | 'CHECK' | 'WARN' | 'ERROR';

/** Emit a canonical wait-mode log line. Append-only, no ANSI, plain text. */
export const log = (
  quiet: boolean,
  level: LogLevel,
  message: string,
  fields: Record<string, string | number> = {},
): void => {
  if (quiet) {
    return;
  }
  const ts = new Date().toISOString();
  const fieldStr = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');

  console.log(
    `[${ts}] ${level.padEnd(5)} ${message}${fieldStr ? '  ' + fieldStr : ''}`,
  );
};
