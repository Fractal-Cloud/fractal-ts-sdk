/**
 * api-error.ts — the SDK's single error boundary for Fractal Cloud API calls.
 *
 * WHY THIS EXISTS
 *
 * Credentials travel as request headers (`X-ClientID` / `X-ClientSecret`, and on
 * the environment initializer call an Azure SP secret, a GCP service-account JSON
 * key, AWS keys — see http.ts and environment/service.ts). A rejected superagent
 * request carries the whole request/response object graph, and Node's inspection
 * of it walks `response.res.req._header` — the RAW request header block. So the
 * ordinary consumer idiom
 *
 *     main().catch(err => { console.error(err); process.exit(1); });
 *
 * printed the client secret. Measured against a local 403 listener before this
 * module existed: 84,937 bytes of output with the secret appearing 18 times, on
 * the most likely first-run failure there is — a mistyped credential returning
 * 401/403. CI logs are long-lived and widely readable, which is what makes this
 * severe rather than untidy.
 *
 * LAYER 1 — STRUCTURAL. {@link sanitizeApiError} does not scrub the superagent
 * error; it REPLACES it with a {@link FractalApiError} carrying only primitives
 * chosen here. The request object, response object, socket, agent and the original
 * error are all dropped — including as `cause`, because inspection follows cause
 * chains. Nothing that ever held a header survives the boundary, so on the request
 * path there is no representation left for an encoding to hide in.
 *
 * LAYER 2 — VALUE REDACTION, for the one thing this module must quote: a response
 * body the SERVER produced, which can echo back something we sent. The
 * `initializer/…/initialize` endpoint is the sharp case, because validating
 * provider credentials is its job, so an error body quoting the offending value is
 * the ordinary shape of a validation failure — and those credentials (a GCP
 * service-account JSON key, an SSH private key) are higher-value than the client
 * secret. Layer 2 therefore covers EVERY secret the SDK sends, not just the client
 * pair; call sites pass what their request carried via `extraSecrets`.
 *
 * Layer 2 follows the sibling samples repo's `fatal.ts` rather than inventing a
 * third approach, because two earlier attempts there failed review:
 *
 *   - Literal-byte redaction was defeated by JSON escaping: the compared value
 *     held a real newline, the printed text held the two-character escape `\n`,
 *     they never matched, and a full private key printed with zero redaction
 *     markers.
 *   - Truncation was mistaken for redaction: the clip ran BEFORE redaction, so a
 *     secret straddling the boundary had its head printed — 25 of 35 characters.
 *
 * The order in `bodyPreview` is therefore load-bearing and identical to
 * `fatal.ts`'s: **redact the parsed DATA first** (where every string is raw, so a
 * raw comparison matches), THEN serialize, THEN sweep the serialized text (a
 * `toJSON`/getter can introduce a value the data walk never saw), and only THEN
 * clip.
 *
 * Escaping is handled to arbitrary depth, not one level. A gateway that wraps an
 * upstream payload as a JSON string of JSON escapes a secret twice, and a
 * one-level spelling set matched neither the raw nor the doubly-escaped form —
 * leaking the value AND emitting no marker, so nothing signalled the miss. See
 * {@link spellings} and `redactData`'s JSON-in-string branch.
 */

import type {Credentials, LabeledSecret} from './http';

export type {LabeledSecret};

/**
 * What the boundary needs to know about the caller: the client credentials, plus
 * any operation-scoped secrets carried on the config (see `ApiConfig.extraSecrets`).
 */
type SecretBearingConfig = Pick<Credentials, 'clientSecret'> & {
  clientId?: string;
  extraSecrets?: readonly LabeledSecret[];
};

/** Marker written in place of a redacted value. Names WHICH secret matched. */
export const redactionMarker = (label: string): string =>
  `***${label} REDACTED***`;

/** The generic marker, for a secret with no more specific label. */
export const REDACTED = redactionMarker('SECRET');

/** Longest response-body preview — and longest message — kept on an error. */
export const BODY_PREVIEW_LIMIT = 2_000;

/** How deep `redactData` walks a response body before it stops descending. */
const MAX_DATA_DEPTH = 8;

/**
 * Shortest IDENTIFIER worth redacting. Applies only to identifier-class values
 * (`clientId`), never to secrets: for a secret, over-redaction costs diagnostic
 * detail while under-redaction prints a credential, so secrets have no floor. An
 * identifier is not a credential on its own, and redacting a 2-character one
 * mangles every unrelated word that contains those characters.
 */
const IDENTIFIER_MIN_REDACTABLE = 8;

/**
 * How many times a value may be re-escaped and still be recognized. Each level of
 * JSON nesting escapes an already-escaped form again, so spellings are generated to
 * a FIXED POINT rather than a fixed count: a value containing nothing JSON escapes
 * (a UUID, base64) stabilizes after one iteration and costs nothing, while a PEM
 * key or a service-account JSON key — the values that actually contain newlines and
 * quotes — get one spelling per nesting level. Capped so a pathological value
 * cannot expand without bound.
 */
const MAX_ESCAPE_DEPTH = 6;

/** A secret value paired with one concrete spelling it can take in output. */
type SecretForm = {label: string; form: string};

/**
 * Every spelling of `value` that could appear in printed output: the raw value,
 * then `JSON.stringify` applied repeatedly until the result stops changing.
 *
 * One level is not enough. `JSON.stringify` renders a newline as `\n`; serializing
 * that result again renders the backslash as `\\`, giving `\\n`. A body that is a
 * JSON string of JSON therefore contains the twice-escaped spelling, which a
 * one-level set does not match — and because nothing matched, no marker was emitted
 * either, so the log gave no hint that redaction had been attempted and missed. The
 * escaped spellings are derived with the SAME transform that produces the output,
 * so the two cannot drift.
 */
const spellings = (value: string): string[] => {
  const forms = [value];
  let current = value;
  for (let i = 0; i < MAX_ESCAPE_DEPTH; i++) {
    const escaped = JSON.stringify(current).slice(1, -1);
    if (escaped === current || forms.includes(escaped)) {
      break;
    }
    forms.push(escaped);
    current = escaped;
  }
  return forms;
};

/**
 * Expand labeled secrets into every spelling, longest first.
 *
 * Longest first matters: if one secret's value is a prefix of another's,
 * substituting the short one first destroys the long one's match and leaves its
 * tail in the output.
 *
 * No minimum-length floor. Over-redacting an error message costs a little
 * diagnostic detail; under-redacting prints a credential. Unlike a console line a
 * customer copies for teardown, nothing here has to survive intact — which is why
 * the samples' STDOUT floor is deliberately not replicated on this path.
 */
const secretForms = (secrets: readonly LabeledSecret[]): SecretForm[] =>
  secrets
    .filter(s => typeof s.value === 'string' && s.value.length > 0)
    .flatMap(s => spellings(s.value).map(form => ({label: s.label, form})))
    .filter((f, i, all) => all.findIndex(o => o.form === f.form) === i)
    .sort((a, b) => b.form.length - a.form.length);

/** Literal replace — no regex, so no escaping bugs and no pathological backtracking. */
const applyForms = (text: string, forms: readonly SecretForm[]): string => {
  let out = text;
  for (const {label, form} of forms) {
    if (out.includes(form)) {
      out = out.split(form).join(redactionMarker(label));
    }
  }
  return out;
};

/** Own enumerable properties are the whole story for these. */
const isPlainObject = (value: object): boolean => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Redact the DATA before it is serialized, walking strings, arrays, and the keys as
 * well as the values of plain objects. At this point every string is raw, so the raw
 * spelling matches however many times the value is serialized afterwards.
 *
 * A string leaf that is ITSELF JSON is parsed and walked, then re-serialized, so a
 * double- or triple-encoded body is redacted at its innermost level too — belt to
 * the escaped-spelling braces.
 *
 * Anything that is not a plain object or array passes through untouched: a `Date` or
 * a class instance renders through its own `toJSON`, and rebuilding it as a plain
 * object would turn a timestamp into `{}`, destroying the diagnostic for no security
 * gain. The post-serialization sweep in {@link bodyPreview} covers those.
 */
const redactData = (
  value: unknown,
  forms: readonly SecretForm[],
  depth = 0,
): unknown => {
  if (typeof value === 'string') {
    const cleaned = applyForms(value, forms);
    if (depth >= MAX_DATA_DEPTH) {
      return cleaned;
    }
    const trimmed = cleaned.trim();
    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'));
    if (looksLikeJson) {
      try {
        const inner = redactData(JSON.parse(cleaned), forms, depth + 1);
        return JSON.stringify(inner);
      } catch {
        return cleaned;
      }
    }
    return cleaned;
  }
  if (value === null || typeof value !== 'object' || depth >= MAX_DATA_DEPTH) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => redactData(item, forms, depth + 1));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  // Null-prototype: assigning a `__proto__` key onto a normal `{}` would hit the
  // inherited setter instead of creating an own property, silently dropping it.
  const out: Record<string, unknown> = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    out[applyForms(key, forms)] = redactData(item, forms, depth + 1);
  }
  return out;
};

/**
 * Remove every spelling of every secret from already-rendered text.
 *
 * Exported for callers rendering their own diagnostics. The guarantee is specific:
 * raw plus JSON-escaped-to-a-fixed-point spellings. A value re-encoded some other
 * way — percent-encoding, base64 — is NOT matched; no redactor can enumerate every
 * encoding, which is why layer 1 is what protects the request.
 */
export const redactSecrets = (
  text: string,
  secrets: readonly (string | LabeledSecret)[],
): string =>
  applyForms(
    text,
    secretForms(
      secrets.map(s =>
        typeof s === 'string' ? {label: 'SECRET', value: s} : s,
      ),
    ),
  );

/** Redact, then clip. Never the other way round. */
const clip = (text: string): string => {
  if (text.length <= BODY_PREVIEW_LIMIT) {
    return text;
  }
  const dropped = text.length - BODY_PREVIEW_LIMIT;
  return `${text.slice(0, BODY_PREVIEW_LIMIT)}… (${dropped} more characters)`;
};

/**
 * Bounded, redacted preview of a response body.
 *
 * Step order is the fix for both prior failures, and matches `fatal.ts`:
 *   1. redact the parsed data, where values are raw and match their raw spelling;
 *   2. serialize, so escaping is applied to text that is already clean;
 *   3. sweep the serialized string too, for anything a `toJSON` or getter
 *      introduced during serialization that the data walk never saw;
 *   4. only then clip.
 */
const bodyPreview = (
  body: unknown,
  forms: readonly SecretForm[],
): string | undefined => {
  if (body === undefined || body === null || body === '') {
    return undefined;
  }
  let text: string | undefined;
  try {
    const redacted = redactData(body, forms);
    text = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
  } catch {
    // A body that cannot be serialized (circular, BigInt) is not worth risking.
    return '(unserializable response body omitted)';
  }
  if (text === undefined || text.length === 0) {
    return undefined;
  }
  return clip(applyForms(text, forms));
};

/**
 * A failed Fractal Cloud API call, carrying only fields this SDK put there.
 *
 * Deliberately NOT holding the superagent request or response: those are how a
 * credential reaches a log. `reasonCode` and `responseBody` replace the
 * `err.response.body` a caller would previously have read.
 */
export class FractalApiError extends Error {
  override readonly name = 'FractalApiError';
  /** HTTP status, when the failure was a response rather than a transport error. */
  readonly status: number | undefined;
  /** Request method, as reported by the client. */
  readonly method: string | undefined;
  /** Request URL or path with any query string removed (a query can carry a token). */
  readonly url: string | undefined;
  /** `reasonCode` from the API's error body, when it sent one. */
  readonly reasonCode: string | undefined;
  /** Redacted, length-bounded preview of the response body. */
  readonly responseBody: string | undefined;

  constructor(
    message: string,
    fields: {
      status?: number | undefined;
      method?: string | undefined;
      url?: string | undefined;
      reasonCode?: string | undefined;
      responseBody?: string | undefined;
    },
  ) {
    // No `cause`: inspection follows cause chains, and the original error is the
    // object holding the header block.
    super(message);
    this.status = fields.status;
    this.method = fields.method;
    this.url = fields.url;
    this.reasonCode = fields.reasonCode;
    this.responseBody = fields.responseBody;
  }
}

/** The parts of a superagent error this module reads. */
type HttpErrorish = {
  status?: unknown;
  message?: unknown;
  method?: unknown;
  response?: {
    status?: unknown;
    body?: unknown;
    text?: unknown;
    req?: {method?: unknown; path?: unknown};
  };
  request?: {method?: unknown; url?: unknown};
};

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

const asNumber = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** Drop any query string — not needed to diagnose, and it can carry a token. */
const withoutQuery = (url: string | undefined): string | undefined =>
  url === undefined ? undefined : url.split('?')[0];

/**
 * Every secret in scope for a request: the client pair, plus whatever the current
 * OPERATION attached to its config. `clientId` is half a credential pair, so it is
 * covered too — free, and it removes a "why not that one" question.
 */
const configSecrets = (credentials: SecretBearingConfig): LabeledSecret[] => {
  const secrets: LabeledSecret[] = [
    {label: 'X-ClientSecret', value: credentials.clientSecret},
  ];
  // `clientId` is an IDENTIFIER, and identifiers get a length floor where secrets
  // do not. With no floor, a two-character id turned "Forbidden" into
  // "Forb***X-ClientID REDACTED***den" and shredded every other diagnostic that
  // happened to contain those characters. `collectSecrets` already excludes
  // identifiers (`spClientId`, `roleArn`, `serviceAccountEmail`) on the grounds
  // that a diagnostic needs them, so covering this one unconditionally was
  // internally inconsistent. Real client ids are UUID-shaped and clear the floor;
  // a 2-character one is not a credential worth shredding a message for.
  if (
    credentials.clientId !== undefined &&
    credentials.clientId.length >= IDENTIFIER_MIN_REDACTABLE
  ) {
    secrets.push({label: 'X-ClientID', value: credentials.clientId});
  }
  return [...secrets, ...(credentials.extraSecrets ?? [])];
};

/**
 * Convert anything thrown by an API call into a {@link FractalApiError} that is
 * safe to print.
 *
 * `extraSecrets` carries the values THIS request sent beyond the client pair —
 * provider credentials on the initializer call, `Secret.value` on the secrets-bulk
 * call, an SSH private key on the CI/CD-profile call. Without them a server that
 * echoes the offending value back would print it: the structural drop covers the
 * request object, not a body the server produced.
 *
 * Applied to EVERY rejection, not only recognizably-HTTP ones: an error that cannot
 * be classified is exactly the case where its contents are unknown.
 */
export const sanitizeApiError = (
  err: unknown,
  credentials: SecretBearingConfig,
  extraSecrets: readonly LabeledSecret[] = [],
): FractalApiError => {
  if (err instanceof FractalApiError) {
    return err;
  }
  const forms = secretForms([...configSecrets(credentials), ...extraSecrets]);
  const e = (err ?? {}) as HttpErrorish;
  const status = asNumber(e.status) ?? asNumber(e.response?.status);
  const method = asString(e.method) ?? asString(e.response?.req?.method);
  const url =
    withoutQuery(asString(e.request?.url)) ??
    withoutQuery(asString(e.response?.req?.path));
  const body = e.response?.body ?? asString(e.response?.text);
  const reasonCode = asString(
    (body as {reasonCode?: unknown} | undefined)?.reasonCode,
  );
  const responseBody = bodyPreview(body, forms);

  const rawMessage =
    asString(e.message) ??
    (err instanceof Error ? err.message : undefined) ??
    'Fractal Cloud API request failed';
  const detail = [
    status === undefined ? undefined : `HTTP ${status}`,
    method === undefined && url === undefined
      ? undefined
      : `${method ?? ''} ${url ?? ''}`.trim(),
    reasonCode === undefined ? undefined : `reasonCode=${reasonCode}`,
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * EVERY string this error will store or print goes through here — no field is
   * exempt and none is handled specially.
   *
   * `reasonCode` shipped unredacted because it was treated as "just a code", while
   * `message` and `responseBody` beside it were both covered. It is server-
   * controlled, so a server appending context to it lands a value we sent straight
   * onto a field `console.error(err)` prints — F1's threat model on the one field
   * the fix had missed. `method` and `url` were also passing through untouched;
   * they come from our own request rather than the response, but "which field a
   * secret happens to land in" is exactly the reasoning the structural fix exists
   * to stop relying on.
   *
   * Redact, then clip — never the reverse (clipping first leaves the head of a
   * straddling secret behind). Applying this to an already-redacted string is
   * harmless: replacement is idempotent.
   */
  const scrub = (value: string | undefined): string | undefined =>
    value === undefined ? undefined : clip(applyForms(value, forms));

  // `status` is the only stored field that is not a string; a number cannot carry
  // a credential, and `name` is a literal. `stack` is derived from `message` at
  // construction, so it inherits the scrubbed text.
  return new FractalApiError(
    scrub(detail.length > 0 ? `${rawMessage} (${detail})` : rawMessage)!,
    {
      status,
      method: scrub(method),
      url: scrub(url),
      reasonCode: scrub(reasonCode),
      responseBody: scrub(responseBody),
    },
  );
};

/**
 * Await an API request and convert any rejection at the boundary.
 *
 * EVERY superagent call in this SDK must go through here. That is enforced by a
 * source-level test in `api-error.test.ts`, not by memory: the samples audit showed
 * call-site discipline decays, and one unwrapped entrypoint restores the whole
 * 84 KB leak.
 *
 * Pass `extraSecrets` whenever the request carries a credential beyond the client
 * pair, so a server that echoes it back cannot print it.
 */
export const send = async <T>(
  credentials: SecretBearingConfig,
  request: PromiseLike<T>,
  extraSecrets: readonly LabeledSecret[] = [],
): Promise<T> => {
  try {
    return await request;
  } catch (err) {
    throw sanitizeApiError(err, credentials, extraSecrets);
  }
};

/**
 * Names whose VALUES are credentials — used for both provider header maps
 * (`X-Azure-SP-Client-Secret`) and credential objects (`spClientSecret`).
 *
 * Matched by pattern rather than an enumerated list, so a newly added provider
 * field or header is covered by default; the cost of that choice is occasional
 * over-redaction, which on an error path is the right side to err on.
 *
 * Deliberately NOT matched, because they are identifiers whose presence in a
 * diagnostic is the whole point: `roleArn` / `X-AWS-Role-Arn`, `spClientId` /
 * `X-Azure-SP-Client-ID`, `serviceAccountEmail`, `workloadIdentityProvider`,
 * `serviceAccountId`, `region`, `tenantId`, `subscriptionId`.
 *
 * `^value$` looks out of place next to the others and is deliberate: `Secret` is
 * `{shortName, displayName, value}`, so the one credential object in this SDK whose
 * secret field is called `value` would otherwise walk out of here EMPTY. Today
 * nothing depends on that — `deployEnvironment` maps `Secret.value` explicitly — but
 * a future call site routing environment secrets through this function would have
 * silently reintroduced the whole finding with no visible error. Anchored so it
 * matches only a field named exactly `value`, not `valueType` or `defaultValue`.
 */
const SECRET_NAME_PATTERN =
  /secret|token|credential|assertion|password|passphrase|private|key|^value$/i;

/**
 * Walk a header map or credential object and collect every string leaf whose KEY
 * marks it a credential. Nested objects are walked (ProviderCredentials is
 * `{aws?: {...}, azure?: {...}}`), so one call covers every provider.
 */
export const collectSecrets = (
  source: unknown,
  path = '',
  depth = 0,
): LabeledSecret[] => {
  if (source === null || typeof source !== 'object' || depth > 4) {
    return [];
  }
  return Object.entries(source).flatMap(([name, value]) => {
    const label = path === '' ? name : `${path}.${name}`;
    if (typeof value === 'string') {
      return SECRET_NAME_PATTERN.test(name) && value.length > 0
        ? [{label, value}]
        : [];
    }
    return collectSecrets(value, label, depth + 1);
  });
};
