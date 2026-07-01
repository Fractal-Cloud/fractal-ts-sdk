/**
 * http.ts — shared HTTP contract for the Fractal Cloud API.
 *
 * Base URL, credential headers, the wait-mode log format (see ~/Projects/CLAUDE.md
 * "SDK — Wait Mode Log Format"), and small timing helpers. Reused by both the
 * LiveSystem deploy service (`service.ts`) and the Environment service
 * (`environment/service.ts`) so there is exactly one HTTP contract.
 */

export const FRACTAL_API_URL = 'https://api.fractal.cloud';
export const CLIENT_ID_HEADER = 'X-ClientID';
export const CLIENT_SECRET_HEADER = 'X-ClientSecret';

export type Credentials = {clientId: string; clientSecret: string};

export const authHeaders = (c: Credentials): Record<string, string> => ({
  [CLIENT_ID_HEADER]: c.clientId,
  [CLIENT_SECRET_HEADER]: c.clientSecret,
});

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
