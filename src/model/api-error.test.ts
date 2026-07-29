/**
 * api-error.test.ts — executable spec for the SDK's error boundary.
 *
 * The defect under test: credentials travel as request headers, a rejected
 * superagent request carries the raw header block at `response.res.req._header`,
 * and Node's inspection of that error prints the client secret. Measured before
 * the fix, through the SDK's public API against a local 403 listener: 84,937
 * bytes of output, secret ×18.
 *
 * Two approaches that failed review in the sibling samples repository are pinned
 * here as regression tests, because the temptation to reach for either is real:
 *   - literal-byte redaction, defeated by JSON escaping (a full private key
 *     printed with zero redaction markers);
 *   - truncation mistaken for redaction (a clip that split a secret printed 25 of
 *     its 35 characters).
 */
import {describe, it, expect} from 'vitest';
import {createServer} from 'node:http';
import {inspect} from 'node:util';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import superagent from 'superagent';
import {
  BODY_PREVIEW_LIMIT,
  collectSecrets,
  FractalApiError,
  REDACTED,
  redactSecrets,
  sanitizeApiError,
  send,
} from './api-error';
import {authHeaders} from './http';

const SECRET = 'SUPERSECRET-CLIENTSECRET-VALUE-9f3a';
const credentials = {clientId: 'client-abc', clientSecret: SECRET};

/** A superagent-shaped error carrying the header block, as thrown on a 403. */
const superagentShapedError = (body: unknown = {reasonCode: 'Forbidden'}) => {
  const err = new Error('Forbidden') as Error & Record<string, unknown>;
  err.status = 403;
  const rawHeaderBlock =
    'POST /livesystems HTTP/1.1\r\n' +
    'Host: api.fractal.cloud\r\n' +
    'X-ClientID: client-abc\r\n' +
    `X-ClientSecret: ${SECRET}\r\n` +
    'Connection: close\r\n\r\n';
  err.response = {
    status: 403,
    body,
    req: {method: 'POST', path: '/livesystems', _header: rawHeaderBlock},
    res: {req: {_header: rawHeaderBlock}},
  };
  err.request = {method: 'POST', url: 'https://api.fractal.cloud/livesystems'};
  return err;
};

describe('sanitizeApiError — structural containment', () => {
  it('produces an error whose full inspection contains no credential', () => {
    const sanitized = sanitizeApiError(superagentShapedError(), credentials);
    // `depth: null` walks the whole graph, which is what console.error(err) does.
    const printed = inspect(sanitized, {depth: null});
    expect(printed).not.toContain(SECRET);
    expect(printed).not.toContain('X-ClientSecret:');
    expect(printed).not.toContain('_header');
  });

  it('drops the request and response objects entirely, and sets no cause', () => {
    const sanitized = sanitizeApiError(superagentShapedError(), credentials);
    // Not "redacted in place" — absent. There is no representation left for an
    // encoding to hide in, which is the whole argument for doing it this way.
    expect(sanitized).not.toHaveProperty('response');
    expect(sanitized).not.toHaveProperty('request');
    expect(sanitized.cause).toBeUndefined();
  });

  it('keeps the diagnostics a caller needs', () => {
    const sanitized = sanitizeApiError(superagentShapedError(), credentials);
    expect(sanitized).toBeInstanceOf(FractalApiError);
    expect(sanitized.status).toBe(403);
    expect(sanitized.method).toBe('POST');
    expect(sanitized.url).toBe('https://api.fractal.cloud/livesystems');
    expect(sanitized.reasonCode).toBe('Forbidden');
    expect(sanitized.message).toContain('HTTP 403');
  });

  it('sanitizes an unrecognized throwable rather than passing it through', () => {
    // An error that cannot be classified is exactly the case where its contents
    // are unknown, so it must not escape the boundary either.
    const weird = {message: `boom ${SECRET}`, extra: {nested: SECRET}};
    const sanitized = sanitizeApiError(weird, credentials);
    const printed = inspect(sanitized, {depth: null});
    expect(printed).not.toContain(SECRET);
    // The marker names WHICH secret matched, so a reader knows what was removed.
    expect(sanitized.message).toContain('X-ClientSecret REDACTED');
    expect(REDACTED).toContain('REDACTED');
  });

  it('is idempotent — re-sanitizing its own output changes nothing', () => {
    const once = sanitizeApiError(superagentShapedError(), credentials);
    expect(sanitizeApiError(once, credentials)).toBe(once);
  });

  it('strips a query string from the recorded url', () => {
    const err = superagentShapedError();
    (err.request as {url: string}).url =
      'https://api.fractal.cloud/livesystems?token=abc123';
    expect(sanitizeApiError(err, credentials).url).toBe(
      'https://api.fractal.cloud/livesystems',
    );
  });
});

describe('response-body redaction — the two lessons', () => {
  // LESSON 1 (JSON escaping). A secret containing a newline is rendered by
  // JSON.stringify as the two-character escape `\n`, which never equals the raw
  // value. Comparing against the raw value alone let a full private key print.
  it('redacts a secret that the body echoes in JSON-escaped form', () => {
    const pemLike = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXk\n';
    const err = superagentShapedError({echoed: pemLike});
    const sanitized = sanitizeApiError(err, {clientSecret: pemLike});
    const printed = inspect(sanitized, {depth: null});
    expect(sanitized.responseBody).toContain('REDACTED');
    expect(printed).not.toContain('b3BlbnNzaC1rZXk');
    // Neither spelling survives: not the raw value, not the escaped one.
    expect(printed).not.toContain(pemLike);
    expect(printed).not.toContain(JSON.stringify(pemLike).slice(1, -1));
  });

  it('redacts quotes and backslashes, which JSON also escapes', () => {
    const nasty = 'pa55"word\\with/escapes';
    const err = superagentShapedError({echoed: nasty});
    const printed = inspect(sanitizeApiError(err, {clientSecret: nasty}), {
      depth: null,
    });
    expect(printed).not.toContain(nasty);
    expect(printed).not.toContain(JSON.stringify(nasty).slice(1, -1));
  });

  // LESSON 2 (truncation is not redaction). Clipping before redacting leaves the
  // head of a secret that straddles the boundary; no later comparison can match
  // it. Sweep the offsets where the secret crosses BODY_PREVIEW_LIMIT.
  it('never prints a fragment of a secret that straddles the preview limit', () => {
    for (
      let pad = BODY_PREVIEW_LIMIT - 45;
      pad < BODY_PREVIEW_LIMIT + 5;
      pad++
    ) {
      const err = superagentShapedError({
        filler: 'x'.repeat(pad),
        echoed: SECRET,
      });
      const printed = inspect(sanitizeApiError(err, credentials), {
        depth: null,
      });
      expect(printed).not.toContain(SECRET);
      // Every prefix of length >= 8 must be absent too — a 25-of-35 prefix is
      // enough to confirm and correlate a credential.
      for (let n = 8; n <= SECRET.length; n++) {
        expect(
          printed.includes(SECRET.slice(0, n)),
          `pad=${pad} leaked a ${n}-character prefix`,
        ).toBe(false);
      }
    }
  });

  it('still bounds the preview length', () => {
    const err = superagentShapedError({filler: 'y'.repeat(10_000)});
    const preview = sanitizeApiError(err, credentials).responseBody!;
    expect(preview.length).toBeLessThan(BODY_PREVIEW_LIMIT + 60);
    expect(preview).toContain('more characters');
  });

  it('replaces the longest secret first so no tail survives', () => {
    // A short secret that is a prefix of a longer one: replacing the short one
    // first would destroy the long match and leave its tail in the output.
    const short = 'abc12345';
    const long = 'abc12345678xyz';
    const out = redactSecrets(`body=${long}`, [short, long]);
    expect(out).not.toContain('678xyz');
    expect(out).toBe(`body=${REDACTED}`);
  });

  it('leaves text alone when no secret occurs, and tolerates an empty secret', () => {
    expect(redactSecrets('nothing to see', [SECRET])).toBe('nothing to see');
    expect(redactSecrets('nothing to see', [''])).toBe('nothing to see');
  });

  // Depth 1 was fixed first and shipped; review proved a DOUBLE-encoded body still
  // leaked and — worse — emitted no marker, so nothing signalled the miss. A gateway
  // wrapping an upstream payload as a JSON string of JSON is the ordinary way that
  // happens. Spellings now iterate to a fixed point.
  it.each([0, 1, 2, 3, 4])(
    'redacts a PEM key escaped %i times, and always emits a marker',
    depth => {
      const pem =
        '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEA\n-----END OPENSSH PRIVATE KEY-----\n';
      let text = pem;
      for (let i = 0; i < depth; i++) {
        text = JSON.stringify(text).slice(1, -1);
      }
      const out = redactSecrets(`{"detail":"${text}"}`, [
        {label: 'ciCdProfile', value: pem},
      ]);
      expect(out).not.toContain('b3BlbnNzaC1rZXktdjEA');
      expect(out).toContain('REDACTED');
    },
  );

  it('redacts a service-account JSON key (quotes and escaped newlines) at depth', () => {
    const saKey =
      '{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvAIB\\n-----END PRIVATE KEY-----\\n"}';
    const once = JSON.stringify(saKey).slice(1, -1);
    for (const text of [saKey, once, JSON.stringify(once).slice(1, -1)]) {
      const out = redactSecrets(`{"detail":"${text}"}`, [
        {label: 'X-GCP-Service-Account-Credentials', value: saKey},
      ]);
      expect(out).not.toContain('MIIEvAIB');
      expect(out).toContain('REDACTED');
    }
  });

  it('redacts a secret nested inside a JSON-in-string body leaf', () => {
    // The data walk parses a string leaf that is itself JSON and redacts inside it,
    // so the innermost level is covered even before escape spellings apply.
    const err = superagentShapedError({
      upstream: JSON.stringify({inner: JSON.stringify({sp: SECRET})}),
    });
    const printed = inspect(sanitizeApiError(err, credentials), {depth: null});
    expect(printed).not.toContain(SECRET);
    expect(printed).toContain('REDACTED');
  });

  it('redacts a secret that appears as an object KEY', () => {
    const err = superagentShapedError({[SECRET]: 'echoed as a key'});
    const printed = inspect(sanitizeApiError(err, credentials), {depth: null});
    expect(printed).not.toContain(SECRET);
  });
});

// The reported defect was the client secret, but the SDK sends much more — provider
// credentials as headers on the initializer call, `Secret.value` and SSH private keys
// as request bodies. The structural drop covers the REQUEST; a server quoting the
// offending value back in its error body needs the values in the redaction set.
describe('every secret the SDK sends, not only the one that was reported', () => {
  const AZURE_SP_SECRET = 'AZURE-SP-SECRET~q7Xk.4dP';
  const withProviderSecret = {
    ...credentials,
    extraSecrets: [{label: 'X-Azure-SP-Client-Secret', value: AZURE_SP_SECRET}],
  };

  it('redacts an operation-scoped secret carried on the config', () => {
    const err = superagentShapedError({
      detail: `rejected credential: ${AZURE_SP_SECRET}`,
    });
    const printed = inspect(sanitizeApiError(err, withProviderSecret), {
      depth: null,
    });
    expect(printed).not.toContain(AZURE_SP_SECRET);
    expect(printed).toContain('X-Azure-SP-Client-Secret REDACTED');
  });

  it('covers a request that never carried the secret itself', () => {
    // The regression this exists for: the initialization-STATUS poll sends no
    // credential, but a server can report "the credentials you provided are
    // invalid: <value>" from it. A per-call-site secret set missed exactly this and
    // printed an Azure SP secret end-to-end; an operation-scoped set covers it.
    const statusPoll = superagentShapedError({
      reasonCode: 'InvalidCredentials',
      detail: `rejected: ${AZURE_SP_SECRET}`,
    });
    const printed = inspect(sanitizeApiError(statusPoll, withProviderSecret), {
      depth: null,
    });
    expect(printed).not.toContain(AZURE_SP_SECRET);
  });

  it('collects credential-bearing fields and leaves identifiers alone', () => {
    const collected = collectSecrets(
      {
        aws: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG',
          roleArn: 'arn:aws:iam::1:role/r',
        },
        azure: {spClientId: 'sp-public', spClientSecret: AZURE_SP_SECRET},
        gcp: {
          serviceAccountEmail: 'sa@project.iam.gserviceaccount.com',
          serviceAccountCredentials: '{"private_key":"x"}',
          workloadIdentityProvider: 'projects/1/locations/global/x',
        },
      },
      'providerCredentials',
    );
    const values = collected.map(s => s.value);
    // Credentials collected…
    expect(values).toContain('wJalrXUtnFEMI/K7MDENG');
    expect(values).toContain(AZURE_SP_SECRET);
    expect(values).toContain('{"private_key":"x"}');
    expect(values).toContain('AKIAIOSFODNN7EXAMPLE');
    // …identifiers deliberately NOT, because a diagnostic needs them.
    expect(values).not.toContain('arn:aws:iam::1:role/r');
    expect(values).not.toContain('sp-public');
    expect(values).not.toContain('sa@project.iam.gserviceaccount.com');
    expect(values).not.toContain('projects/1/locations/global/x');
    // Labels are pathed, so a log says WHICH credential matched.
    expect(collected.map(s => s.label)).toContain(
      'providerCredentials.azure.spClientSecret',
    );
  });

  it('caps the message as well as the body', () => {
    const err = superagentShapedError();
    (err as {message: string}).message = 'x'.repeat(50_000);
    const sanitized = sanitizeApiError(err, credentials);
    expect(sanitized.message.length).toBeLessThan(BODY_PREVIEW_LIMIT + 60);
  });
});

/**
 * `reasonCode` shipped unredacted while `message` and `responseBody` either side of
 * it were both covered — a leak on the one field that had been treated as "just a
 * code". These tests enumerate the error's ENTIRE surface instead of naming fields,
 * so a field added later is covered without anyone remembering to add a case.
 */
describe('no field on the thrown error escapes redaction', () => {
  /** Every string the error stores or prints, keyed for a readable failure. */
  const printableStrings = (e: FractalApiError): Record<string, string> => {
    const out: Record<string, string> = {
      message: e.message,
      stack: e.stack ?? '',
      inspect: inspect(e, {depth: null}),
      json: JSON.stringify(e, Object.getOwnPropertyNames(e)),
      String: String(e),
    };
    for (const key of Object.getOwnPropertyNames(e)) {
      const value = (e as unknown as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        out[`own.${key}`] = value;
      }
    }
    return out;
  };

  /** Raw plus every JSON-escaped spelling, so a re-encoded survivor still fails. */
  const spellingsOf = (secret: string): string[] => {
    const forms = [secret];
    for (let i = 0; i < 4; i++) {
      const next = JSON.stringify(forms[forms.length - 1]!).slice(1, -1);
      if (next === forms[forms.length - 1]) {
        break;
      }
      forms.push(next);
    }
    return forms;
  };

  const assertNowhere = (e: FractalApiError, secret: string) => {
    for (const [field, text] of Object.entries(printableStrings(e))) {
      for (const form of spellingsOf(secret)) {
        expect(text.includes(form), `${field} leaked the secret`).toBe(false);
      }
    }
  };

  // The reported case: a server putting a value we sent into `reasonCode`.
  it.each([
    ['plain', 'PLAIN-SECRET-abc123'],
    ['with a newline', 'line1\nline2-secret'],
    ['with a quote and backslash', 'pa55"word\\secret'],
  ])('redacts a secret echoed in reasonCode (%s)', (_name, secret) => {
    const err = superagentShapedError({
      reasonCode: `InvalidCredentials: ${secret}`,
      message: 'nope',
    });
    const sanitized = sanitizeApiError(err, {
      ...credentials,
      extraSecrets: [{label: 'providerCredential', value: secret}],
    });
    assertNowhere(sanitized, secret);
    // Still a usable diagnostic: the code survives, only the value is gone.
    expect(sanitized.reasonCode).toContain('InvalidCredentials');
    expect(sanitized.reasonCode).toContain('REDACTED');
  });

  // Every OTHER field the constructor stores, one at a time, so none is exempt.
  it('redacts a secret arriving in method or url', () => {
    const secret = 'URL-EMBEDDED-SECRET-9f3a';
    const err = superagentShapedError();
    (err.request as {url: string}).url =
      `https://api.fractal.cloud/x/${secret}`;
    (err.response as {req: {method: string}}).req.method = `POST-${secret}`;
    delete (err as Record<string, unknown>).method;
    const sanitized = sanitizeApiError(err, {
      ...credentials,
      extraSecrets: [{label: 'providerCredential', value: secret}],
    });
    assertNowhere(sanitized, secret);
  });

  it('leaves nothing unredacted when the same secret lands in every field at once', () => {
    const secret = 'EVERYWHERE-SECRET-\n"x\\y';
    const err = superagentShapedError({
      reasonCode: `Bad: ${secret}`,
      detail: secret,
      nested: JSON.stringify({inner: JSON.stringify({secret})}),
    });
    (err as {message: string}).message = `failed: ${secret}`;
    (err.request as {url: string}).url = `https://api.fractal.cloud/${secret}`;
    const sanitized = sanitizeApiError(err, {
      ...credentials,
      extraSecrets: [{label: 'providerCredential', value: secret}],
    });
    assertNowhere(sanitized, secret);
  });

  it('scrubs identifiers only above a length floor, so short ids do not shred a message', () => {
    // A 2-character clientId used to turn "Forbidden" into "Forb…den".
    const shortId = {clientId: 'id', clientSecret: SECRET};
    const sanitized = sanitizeApiError(
      superagentShapedError({reasonCode: 'InvalidCredentials'}),
      shortId,
    );
    expect(sanitized.message).toContain('Forbidden');
    expect(sanitized.reasonCode).toBe('InvalidCredentials');

    // A realistic UUID-shaped id is still covered.
    const realisticId = '8f14e45f-ea0d-4b2a-9f6c-1d2e3f4a5b6c';
    const echoed = sanitizeApiError(
      superagentShapedError({detail: `caller ${realisticId}`}),
      {clientId: realisticId, clientSecret: SECRET},
    );
    expect(echoed.responseBody).not.toContain(realisticId);
    expect(echoed.responseBody).toContain('X-ClientID REDACTED');
  });

  it('collects a Secret-shaped object, whose secret field is named `value`', () => {
    // Latent trap: nothing routes env secrets through collectSecrets today, but a
    // future call site that did would have gotten an empty set back.
    const collected = collectSecrets({
      shortName: 'db',
      displayName: 'db',
      value: 'db-password-9f3a',
    });
    expect(collected.map(s => s.value)).toContain('db-password-9f3a');
    // Anchored: a field merely containing "value" is not swept in.
    expect(
      collectSecrets({valueType: 'string', defaultValue: 'plain'}),
    ).toEqual([]);
  });
});

describe('send — end-to-end against a real HTTP failure', () => {
  // The empirical proof, not a hand-built error: real superagent, real socket,
  // real 403. This is the exact path that printed 84,937 bytes before the fix.
  it('a 403 through send() yields output with no credential in it', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(403, {'content-type': 'application/json'});
      res.end(JSON.stringify({reasonCode: 'Forbidden', message: 'nope'}));
    });
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const {port} = server.address() as {port: number};

    let printed = '(nothing thrown)';
    let raw = '(nothing thrown)';
    try {
      await send(
        credentials,
        superagent
          .get(`http://127.0.0.1:${port}/livesystems`)
          .set(authHeaders(credentials)),
      );
    } catch (err) {
      printed = inspect(err, {depth: null});
    }
    // Control: the unwrapped request still leaks, which is what makes the
    // boundary — not superagent — the thing doing the work here.
    try {
      await superagent
        .get(`http://127.0.0.1:${port}/livesystems`)
        .set(authHeaders(credentials));
    } catch (err) {
      raw = inspect(err, {depth: null});
    }
    server.close();

    expect(raw).toContain(SECRET);
    expect(printed).not.toContain(SECRET);
    expect(printed).not.toContain('X-ClientSecret');
    expect(printed.length).toBeLessThan(2_000);
    expect(printed).toContain('FractalApiError');
    expect(printed).toContain('HTTP 403');
  });
});

describe('no SDK request may bypass the boundary', () => {
  // The samples audit's own caveat: call-site discipline decays, and one
  // unwrapped entrypoint restores the whole leak. This makes that a red build
  // instead of a code-review hope.
  const srcRoot = join(import.meta.dirname, '..');

  const tsFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap(entry => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        return tsFiles(full);
      }
      return entry.endsWith('.ts') && !entry.endsWith('.test.ts') ? [full] : [];
    });

  /**
   * Every mention of the `superagent` identifier must be either its import or the
   * first argument-position expression inside a `send(<config>, superagent…)` call.
   *
   * Counting `superagent.` uses against `send(cfg, superagent` wraps was the first
   * attempt and review broke it three ways: `superagent('GET', url)` (a documented
   * entrypoint, so no bad intent needed), `const sa = superagent`, and
   * `const {get} = superagent`. Matching the identifier itself closes all three,
   * and no longer depends on the config being named `cfg`.
   */
  /**
   * Blank out string literals and comments before scanning, so prose mentioning
   * superagent (this module's own doc comment does, repeatedly) is not an offender.
   * Replacing rather than deleting keeps every byte offset, so reported line
   * numbers stay true.
   */
  const strippedCode = (text: string): string =>
    text
      .replace(
        /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g,
        m => ' '.repeat(m.length),
      )
      .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length));

  it('every superagent reference in src/ is an import or a send() argument', () => {
    const offenders: string[] = [];
    for (const file of tsFiles(srcRoot)) {
      const code = strippedCode(readFileSync(file, 'utf-8'));
      for (const match of code.matchAll(/\bsuperagent\b/g)) {
        const at = match.index;
        const line = code.slice(0, at).split('\n').length;
        const before = code.slice(Math.max(0, at - 120), at);
        const isImport = /\bimport\s+$/.test(before);
        // `send(<config>,` immediately before the identifier.
        const isSendArgument = /\bsend\(\s*[A-Za-z_$][\w$.]*\s*,\s*$/.test(
          before,
        );
        if (!isImport && !isSendArgument) {
          offenders.push(`${file}:${line}: unwrapped superagent reference`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
