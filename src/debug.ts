/**
 * Debug logging for Fractal Cloud SDK HTTP calls.
 *
 * Enabled by setting the FRACTAL_DEBUG environment variable to "true".
 * When enabled, every outbound API request and every inbound response
 * (including error responses) is printed to stdout in the format:
 *
 *   [ISO-8601] DEBUG → METHOD URL [label]  body=<json>
 *   [ISO-8601] DEBUG ← STATUS METHOD URL [label]  body=<json>
 *
 * Authentication headers are never logged.
 * If the request body cannot be serialised to JSON (e.g. circular reference),
 * a <non-serialisable> marker is logged instead of crashing.
 */

const isEnabled = (): boolean =>
  process.env['FRACTAL_DEBUG']?.toLowerCase() === 'true';

const trySerialise = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '<non-serialisable>';
  }
};

/**
 * Logs an outbound HTTP request when debug mode is active.
 * @param method  HTTP method in uppercase, e.g. "GET"
 * @param url     Full request URL
 * @param body    Optional request body (JSON-serialised; not truncated)
 * @param label   Optional context label shown in brackets, e.g. "existence check"
 */
export const debugRequest = (
  method: string,
  url: string,
  body?: unknown,
  label?: string,
): void => {
  if (!isEnabled()) return;
  const ts = new Date().toISOString();
  const labelStr = label ? ` [${label}]` : '';
  const bodyStr = body !== undefined ? `  body=${trySerialise(body)}` : '';
  console.log(`[${ts}] DEBUG → ${method} ${url}${labelStr}${bodyStr}`);
};

/**
 * Logs an inbound HTTP response (or error response) when debug mode is active.
 * @param method  HTTP method of the originating request
 * @param url     Full request URL
 * @param status  HTTP status code received
 * @param body    Optional response body (JSON-serialised; not truncated)
 * @param label   Optional context label shown in brackets
 */
export const debugResponse = (
  method: string,
  url: string,
  status: number,
  body?: unknown,
  label?: string,
): void => {
  if (!isEnabled()) return;
  const ts = new Date().toISOString();
  const labelStr = label ? ` [${label}]` : '';
  const bodyStr = body !== undefined ? `  body=${trySerialise(body)}` : '';
  console.log(
    `[${ts}] DEBUG ← ${status} ${method} ${url}${labelStr}${bodyStr}`,
  );
};
