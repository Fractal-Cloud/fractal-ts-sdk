/**
 * ci/adapters.test.ts — the GitHub Actions, Azure DevOps and local CI adapters,
 * driven by simulated CI environment variables and a simulated token endpoint.
 * No real CI is involved.
 */
import {describe, it, expect, vi, afterEach} from 'vitest';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  azureDevOpsIdentity,
  azureDevOpsReporter,
  consoleReporter,
  detectCi,
  githubActionsIdentity,
  githubActionsReporter,
  noCiIdentity,
} from './index';

type Call = {url: string; init: RequestInit | undefined};

/** A fetch that records its calls and answers with `body` / `status`. */
const fakeFetch = (status: number, body: unknown) => {
  const calls: Call[] = [];
  const fn = (async (url: string | URL, init?: RequestInit) => {
    calls.push({url: String(url), init});
    return new Response(JSON.stringify(body), {status});
  }) as typeof fetch;
  return {fn, calls};
};

const captureStdout = () => {
  const lines: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((m: unknown) => {
    lines.push(String(m));
  });
  return {lines, restore: () => spy.mockRestore()};
};

const tempFile = (name: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'fractal-ci-'));
  const path = join(dir, name);
  writeFileSync(path, '');
  return path;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub Actions identity', () => {
  const env = {
    ACTIONS_ID_TOKEN_REQUEST_URL:
      'https://token.actions.example/req?api-version=2.0',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-bearer',
  };

  it('requests a token for the given audience with the request bearer', async () => {
    const f = fakeFetch(200, {value: 'gh-jwt'});
    const identity = githubActionsIdentity(env, f.fn);
    await expect(identity.idToken('sts.amazonaws.com')).resolves.toBe('gh-jwt');
    expect(f.calls).toHaveLength(1);
    const url = new URL(f.calls[0].url);
    expect(url.searchParams.get('audience')).toBe('sts.amazonaws.com');
    // The request URL's own query is kept.
    expect(url.searchParams.get('api-version')).toBe('2.0');
    expect(
      (f.calls[0].init?.headers as Record<string, string>).Authorization,
    ).toBe('Bearer request-bearer');
  });

  it("names 'id-token: write' when the job cannot mint tokens", async () => {
    const identity = githubActionsIdentity({}, fakeFetch(200, {}).fn);
    await expect(identity.idToken('aud')).rejects.toThrow(/id-token: write/);
  });

  it('refuses an error answer without echoing the request bearer', async () => {
    const f = fakeFetch(403, {message: 'nope request-bearer'});
    const identity = githubActionsIdentity(env, f.fn);
    const err = await identity.idToken('aud').catch(e => e as Error);
    expect(err.message).toMatch(/HTTP 403/);
    expect(err.message).not.toContain('request-bearer');
  });

  it('refuses an answer without a token', async () => {
    const identity = githubActionsIdentity(env, fakeFetch(200, {}).fn);
    await expect(identity.idToken('aud')).rejects.toThrow(/no OIDC token/);
  });

  it('has no fixed audience', () => {
    expect(githubActionsIdentity(env).fixedAudience).toBeUndefined();
  });
});

describe('GitHub Actions reporter', () => {
  it('emits workflow commands and escapes what would end them', () => {
    const out = captureStdout();
    const r = githubActionsReporter({});
    r.notice('first\nsecond 100%');
    r.warning('w');
    r.error('e');
    r.mask('s3cr3t');
    out.restore();
    expect(out.lines).toEqual([
      '::notice::first%0Asecond 100%25',
      '::warning::w',
      '::error::e',
      '::add-mask::s3cr3t',
    ]);
  });

  it('does not mask an empty value (it would mask nothing useful)', () => {
    const out = captureStdout();
    githubActionsReporter({}).mask('');
    out.restore();
    expect(out.lines).toEqual([]);
  });

  it('appends markdown to the step summary file', () => {
    const path = tempFile('summary.md');
    const r = githubActionsReporter({GITHUB_STEP_SUMMARY: path});
    r.appendSummary('## one');
    r.appendSummary('## two');
    expect(readFileSync(path, 'utf8')).toBe('## one\n## two\n');
  });

  it('ignores a summary when the runner offers no summary file', () => {
    expect(() => githubActionsReporter({}).appendSummary('x')).not.toThrow();
  });
});

describe('Azure DevOps identity', () => {
  const env = {
    SYSTEM_OIDCREQUESTURI:
      'https://dev.azure.example/org/proj/_apis/distributedtask/hubs/build/plans/p/jobs/j/oidctoken',
    SYSTEM_ACCESSTOKEN: 'system-access-token',
  };

  it('posts to the OIDC request URI with the service connection and System.AccessToken', async () => {
    const f = fakeFetch(200, {oidcToken: 'ado-jwt'});
    const identity = azureDevOpsIdentity(
      env,
      {serviceConnectionId: 'sc-1'},
      f.fn,
    );
    await expect(identity.idToken('api://AzureADTokenExchange')).resolves.toBe(
      'ado-jwt',
    );
    const url = new URL(f.calls[0].url);
    expect(url.origin + url.pathname).toBe(env.SYSTEM_OIDCREQUESTURI);
    expect(url.searchParams.get('api-version')).toBe('7.1');
    expect(url.searchParams.get('serviceConnectionId')).toBe('sc-1');
    expect(f.calls[0].init?.method).toBe('POST');
    const headers = f.calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer system-access-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('reads the service connection id the Azure tasks expose', async () => {
    const f = fakeFetch(200, {oidcToken: 'ado-jwt'});
    const identity = azureDevOpsIdentity(
      {...env, AZURESUBSCRIPTION_SERVICE_CONNECTION_ID: 'sc-env'},
      {},
      f.fn,
    );
    await identity.idToken('api://AzureADTokenExchange');
    expect(
      new URL(f.calls[0].url).searchParams.get('serviceConnectionId'),
    ).toBe('sc-env');
  });

  it('issues one audience only, and refuses any other', async () => {
    const f = fakeFetch(200, {oidcToken: 'ado-jwt'});
    const identity = azureDevOpsIdentity(
      env,
      {serviceConnectionId: 'sc-1'},
      f.fn,
    );
    expect(identity.fixedAudience).toBe('api://AzureADTokenExchange');
    await expect(identity.idToken('sts.amazonaws.com')).rejects.toThrow(
      /api:\/\/AzureADTokenExchange/,
    );
    expect(f.calls).toHaveLength(0);
  });

  it('names the missing System.AccessToken mapping', async () => {
    const identity = azureDevOpsIdentity(
      {SYSTEM_OIDCREQUESTURI: env.SYSTEM_OIDCREQUESTURI},
      {serviceConnectionId: 'sc-1'},
      fakeFetch(200, {}).fn,
    );
    await expect(
      identity.idToken('api://AzureADTokenExchange'),
    ).rejects.toThrow(/SYSTEM_ACCESSTOKEN: \$\(System\.AccessToken\)/);
  });

  it('names the missing service connection', async () => {
    const identity = azureDevOpsIdentity(env, {}, fakeFetch(200, {}).fn);
    await expect(
      identity.idToken('api://AzureADTokenExchange'),
    ).rejects.toThrow(/service connection/);
  });

  it('refuses an error answer without echoing the access token', async () => {
    const f = fakeFetch(401, {message: 'system-access-token bad'});
    const identity = azureDevOpsIdentity(
      env,
      {serviceConnectionId: 'sc-1'},
      f.fn,
    );
    const err = await identity
      .idToken('api://AzureADTokenExchange')
      .catch(e => e as Error);
    expect(err.message).toMatch(/HTTP 401/);
    expect(err.message).not.toContain('system-access-token');
  });
});

describe('Azure DevOps reporter', () => {
  it('emits logging commands and escapes what would end them', () => {
    const out = captureStdout();
    const r = azureDevOpsReporter({});
    r.notice('a\nb');
    r.warning('50% done');
    r.error('e]x');
    r.mask('s3cr3t');
    out.restore();
    expect(out.lines).toEqual([
      'a%0Ab',
      '##vso[task.logissue type=warning]50%AZP25 done',
      '##vso[task.logissue type=error]e]x',
      '##vso[task.setsecret]s3cr3t',
    ]);
  });

  it('uploads each summary as a markdown file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fractal-ado-'));
    const out = captureStdout();
    const r = azureDevOpsReporter({AGENT_TEMPDIRECTORY: dir});
    r.appendSummary('## plan');
    out.restore();
    expect(out.lines).toHaveLength(1);
    const match = /^##vso\[task\.uploadsummary\](.+\.md)$/.exec(out.lines[0]);
    expect(match).not.toBeNull();
    expect(readFileSync(match![1], 'utf8')).toBe('## plan\n');
  });
});

describe('local fallback', () => {
  it('reports to the console and cannot mask', () => {
    const out = captureStdout();
    const r = consoleReporter();
    r.notice('n');
    r.warning('w');
    r.error('e');
    r.mask('never-printed');
    r.appendSummary('## s');
    out.restore();
    expect(out.lines).toEqual(['NOTICE  n', 'WARNING w', 'ERROR   e', '## s']);
  });

  it('has no identity, and says so clearly', async () => {
    await expect(noCiIdentity().idToken('aud')).rejects.toThrow(
      /No CI OIDC identity.*GitHub Actions.*Azure DevOps/s,
    );
  });
});

describe('detectCi()', () => {
  it('picks GitHub Actions', () => {
    expect(detectCi({GITHUB_ACTIONS: 'true'}).name).toBe('github-actions');
  });

  it('picks Azure DevOps', () => {
    expect(detectCi({TF_BUILD: 'True'}).name).toBe('azure-devops');
  });

  it('falls back to local', () => {
    expect(detectCi({}).name).toBe('local');
  });

  it('reads variables from the environment it was given', () => {
    const ci = detectCi({GITHUB_ACTIONS: 'true', SOME_VAR: 'v'});
    expect(ci.variable('SOME_VAR')).toBe('v');
    expect(ci.variable('ABSENT')).toBeUndefined();
    // An empty variable is an absent one: CI systems render unset secrets as ''.
    expect(detectCi({X: ''}).variable('X')).toBeUndefined();
  });
});
