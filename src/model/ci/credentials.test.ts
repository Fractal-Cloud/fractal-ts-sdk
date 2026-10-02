/**
 * ci/credentials.test.ts — credentialsFromCi(): cloud credentials minted from a
 * CI's OIDC identity (the default) or read from its secrets (the standard way),
 * per request, with the right audience per cloud, masked, and refused for
 * anything not configured. STS is simulated.
 */
import {describe, it, expect} from 'vitest';
import {
  ciSecret,
  credentialsFromCi,
  type Ci,
  type CiIdentity,
  type CiReporter,
} from './index';
import {ProviderCredentialsNotConfigured} from '../environment/index';
import type {
  ProviderCredentialsRequest,
  ProviderType,
} from '../environment/index';
import {signAwsRequest} from './credentials/aws_sigv4';

const fakeCi = (
  opts: {fixedAudience?: string; vars?: Record<string, string>} = {},
) => {
  const audiences: string[] = [];
  const masked: string[] = [];
  const notices: string[] = [];
  let n = 0;
  const identity: CiIdentity = {
    fixedAudience: opts.fixedAudience,
    idToken: async audience => {
      if (opts.fixedAudience !== undefined && audience !== opts.fixedAudience) {
        throw new Error(`fixed audience ${opts.fixedAudience}`);
      }
      audiences.push(audience);
      n++;
      return `jwt-${n}`;
    },
  };
  const reporter: CiReporter = {
    notice: m => notices.push(m),
    warning: m => notices.push(m),
    error: m => notices.push(m),
    mask: v => masked.push(v),
    appendSummary: () => undefined,
  };
  const ci: Ci = {
    name: 'github-actions',
    identity,
    reporter,
    variable: name => opts.vars?.[name],
  };
  return {ci, audiences, masked, notices};
};

const request = (
  provider: ProviderType,
  accountId: string,
  shortName = 'mgmt',
): ProviderCredentialsRequest => ({
  environment: {type: 'Organizational', ownerId: 'owner', shortName},
  tier: 'management',
  provider,
  accountId,
  region: provider === 'AWS' ? 'eu-central-1' : 'westeurope',
});

type StsCall = {url: string; body: URLSearchParams; headers: Headers};

const fakeSts = (status = 200, answer?: unknown) => {
  const calls: StsCall[] = [];
  const fn = (async (url: string | URL, init?: RequestInit) => {
    const body = new URLSearchParams(String(init?.body ?? ''));
    calls.push({url: String(url), body, headers: new Headers(init?.headers)});
    const action = body.get('Action');
    const result = {
      Credentials: {
        AccessKeyId: `ASIA-${action}`,
        SecretAccessKey: `secret-${action}`,
        SessionToken: `session-${action}`,
        Expiration: 1767225600,
      },
    };
    return new Response(
      JSON.stringify(
        answer ?? {[`${action}Response`]: {[`${action}Result`]: result}},
      ),
      {status, headers: {'content-type': 'application/json'}},
    );
  }) as typeof fetch;
  return {fn, calls};
};

const ROLE = 'arn:aws:iam::111111111111:role/Deployer';
const WIF =
  'projects/123/locations/global/workloadIdentityPools/github/providers/gh';

describe('credentialsFromCi() — OIDC (default)', () => {
  it('AWS: exchanges a token for sts.amazonaws.com via AssumeRoleWithWebIdentity', async () => {
    const f = fakeCi();
    const sts = fakeSts();
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',aws: {roleArn: ROLE}},
      {fetch: sts.fn},
    );
    const creds = await resolve(request('AWS', '111111111111'));
    expect(f.audiences).toEqual(['sts.amazonaws.com']);
    expect(sts.calls).toHaveLength(1);
    expect(sts.calls[0].url).toBe('https://sts.eu-central-1.amazonaws.com/');
    const body = sts.calls[0].body;
    expect(body.get('Action')).toBe('AssumeRoleWithWebIdentity');
    expect(body.get('RoleArn')).toBe(ROLE);
    expect(body.get('WebIdentityToken')).toBe('jwt-1');
    expect(body.get('DurationSeconds')).toBe('3600');
    expect(body.get('RoleSessionName')).toMatch(/^fractal-mgmt/);
    expect(creds).toEqual({
      aws: {
        accessKeyId: 'ASIA-AssumeRoleWithWebIdentity',
        secretAccessKey: 'secret-AssumeRoleWithWebIdentity',
        sessionToken: 'session-AssumeRoleWithWebIdentity',
      },
    });
    // The token and every secret part of the session are masked.
    expect(f.masked).toEqual(
      expect.arrayContaining([
        'jwt-1',
        'secret-AssumeRoleWithWebIdentity',
        'session-AssumeRoleWithWebIdentity',
      ]),
    );
  });

  it('AWS: hands the token to the control plane when it does the exchange', async () => {
    const f = fakeCi();
    const sts = fakeSts();
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',aws: {roleArn: ROLE, exchange: 'control-plane'}},
      {fetch: sts.fn},
    );
    await expect(resolve(request('AWS', '111111111111'))).resolves.toEqual({
      aws: {roleArn: ROLE, webIdentityToken: 'jwt-1'},
    });
    expect(sts.calls).toHaveLength(0);
  });

  it('AWS: picks the role of the requested account, and refuses any other account', async () => {
    const f = fakeCi();
    const sts = fakeSts();
    const other = 'arn:aws:iam::222222222222:role/Deployer';
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',aws: [{roleArn: ROLE}, {roleArn: other}]},
      {fetch: sts.fn},
    );
    await resolve(request('AWS', '222222222222'));
    expect(sts.calls[0].body.get('RoleArn')).toBe(other);
    await expect(resolve(request('AWS', '333333333333'))).rejects.toThrow(
      /AWS account '333333333333'.*not configured/,
    );
    // A refusal is not "no credentials for this cloud": it is never skipped.
    await expect(
      resolve(request('AWS', '333333333333')),
    ).rejects.not.toBeInstanceOf(ProviderCredentialsNotConfigured);
    // Nothing was minted for the refused account.
    expect(f.audiences).toHaveLength(1);
  });

  it('AWS: passes sessionDurationSeconds and a custom audience', async () => {
    const f = fakeCi();
    const sts = fakeSts();
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',aws: {roleArn: ROLE, sessionDurationSeconds: 7200, audience: 'custom'}},
      {fetch: sts.fn},
    );
    await resolve(request('AWS', '111111111111'));
    expect(f.audiences).toEqual(['custom']);
    expect(sts.calls[0].body.get('DurationSeconds')).toBe('7200');
  });

  it('AWS: reports an STS refusal without the token', async () => {
    const f = fakeCi();
    const sts = fakeSts(403, {
      Error: {Code: 'AccessDenied', Message: 'Not authorized jwt-1'},
    });
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',aws: {roleArn: ROLE}},
      {fetch: sts.fn},
    );
    const err = await resolve(request('AWS', '111111111111')).catch(
      e => e as Error,
    );
    expect(err.message).toMatch(/AccessDenied/);
    expect(err.message).not.toContain('jwt-1');
  });

  it('AWS: reads an XML answer too', async () => {
    const f = fakeCi();
    const xml =
      '<AssumeRoleWithWebIdentityResponse><AssumeRoleWithWebIdentityResult><Credentials>' +
      '<AccessKeyId>ASIAX</AccessKeyId><SecretAccessKey>sx</SecretAccessKey>' +
      '<SessionToken>tx</SessionToken></Credentials></AssumeRoleWithWebIdentityResult>' +
      '</AssumeRoleWithWebIdentityResponse>';
    const fn = (async () =>
      new Response(xml, {
        status: 200,
        headers: {'content-type': 'text/xml'},
      })) as typeof fetch;
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',aws: {roleArn: ROLE}},
      {fetch: fn},
    );
    await expect(resolve(request('AWS', '111111111111'))).resolves.toEqual({
      aws: {accessKeyId: 'ASIAX', secretAccessKey: 'sx', sessionToken: 'tx'},
    });
  });

  it("GCP: mints for the provider's default audience", async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'GCP',
      gcp: {
        serviceAccountEmail: 'deployer@p.iam.gserviceaccount.com',
        workloadIdentityProvider: WIF,
        projectIds: ['proj-1'],
      },
    });
    await expect(resolve(request('GCP', 'proj-1'))).resolves.toEqual({
      gcp: {
        serviceAccountEmail: 'deployer@p.iam.gserviceaccount.com',
        workloadIdentityProvider: WIF,
        federatedToken: 'jwt-1',
      },
    });
    expect(f.audiences).toEqual([`https://iam.googleapis.com/${WIF}`]);
    expect(f.masked).toContain('jwt-1');
    await expect(resolve(request('GCP', 'proj-2'))).rejects.toThrow(
      /GCP project 'proj-2'.*not configured/,
    );
  });

  it('Azure: mints for api://AzureADTokenExchange', async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
    });
    await expect(resolve(request('AZURE', 'sub-1'))).resolves.toEqual({
      azure: {clientId: 'app-1', federatedToken: 'jwt-1'},
    });
    expect(f.audiences).toEqual(['api://AzureADTokenExchange']);
    await expect(resolve(request('AZURE', 'sub-2'))).rejects.toThrow(
      /Azure subscription 'sub-2'.*not configured/,
    );
  });

  it('mints a fresh token for every request, never caching one', async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
    });
    await resolve(request('AZURE', 'sub-1'));
    const second = await resolve(request('AZURE', 'sub-1'));
    expect(second).toEqual({
      azure: {clientId: 'app-1', federatedToken: 'jwt-2'},
    });
  });

  it("uses a CI's fixed audience when the cloud's own is not set (Azure DevOps)", async () => {
    const f = fakeCi({fixedAudience: 'api://AzureADTokenExchange'});
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'GCP',
      gcp: {
        serviceAccountEmail: 'sa@p.iam.gserviceaccount.com',
        workloadIdentityProvider: WIF,
        projectIds: ['proj-1'],
      },
    });
    await resolve(request('GCP', 'proj-1'));
    expect(f.audiences).toEqual(['api://AzureADTokenExchange']);
  });
});

describe('credentialsFromCi() — static secrets (the standard way)', () => {
  const vars = {
    AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'aws-static-secret',
    AWS_SESSION_TOKEN: 'aws-static-session',
    AZURE_CLIENT_SECRET: 'azure-static-secret',
    GCP_KEY: JSON.stringify({
      type: 'service_account',
      client_email: 'key-sa@p.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    }),
  };

  it('AWS: a session from CI secrets is passed through, masked', async () => {
    const f = fakeCi({vars});
    const sts = fakeSts();
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',
        aws: {
          accountId: '111111111111',
          accessKeyId: ciSecret('AWS_ACCESS_KEY_ID'),
          secretAccessKey: ciSecret('AWS_SECRET_ACCESS_KEY'),
          sessionToken: ciSecret('AWS_SESSION_TOKEN'),
        },
      },
      {fetch: sts.fn},
    );
    await expect(resolve(request('AWS', '111111111111'))).resolves.toEqual({
      aws: {
        accessKeyId: 'AKIAEXAMPLE',
        secretAccessKey: 'aws-static-secret',
        sessionToken: 'aws-static-session',
      },
    });
    expect(sts.calls).toHaveLength(0);
    expect(f.audiences).toHaveLength(0);
    expect(f.masked).toEqual(
      expect.arrayContaining(['aws-static-secret', 'aws-static-session']),
    );
  });

  it('AWS: long-lived keys become a session via a signed sts:GetSessionToken', async () => {
    const f = fakeCi({vars});
    const sts = fakeSts();
    const resolve = credentialsFromCi(
      f.ci,
      {
      cloud: 'AWS',
        aws: {
          accountId: '111111111111',
          accessKeyId: ciSecret('AWS_ACCESS_KEY_ID'),
          secretAccessKey: ciSecret('AWS_SECRET_ACCESS_KEY'),
        },
      },
      {fetch: sts.fn},
    );
    const creds = await resolve(request('AWS', '111111111111'));
    expect(sts.calls[0].body.get('Action')).toBe('GetSessionToken');
    const auth = sts.calls[0].headers.get('authorization') ?? '';
    expect(auth).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\/\d{8}\/eu-central-1\/sts\/aws4_request, SignedHeaders=[a-z;-]+, Signature=[0-9a-f]{64}$/,
    );
    // The secret key itself is never sent.
    expect(JSON.stringify([...sts.calls[0].headers])).not.toContain(
      'aws-static-secret',
    );
    expect(sts.calls[0].body.toString()).not.toContain('aws-static-secret');
    expect(creds).toEqual({
      aws: {
        accessKeyId: 'ASIA-GetSessionToken',
        secretAccessKey: 'secret-GetSessionToken',
        sessionToken: 'session-GetSessionToken',
      },
    });
    expect(f.masked).toContain('session-GetSessionToken');
  });

  it('Azure: a service principal secret from CI secrets', async () => {
    const f = fakeCi({vars});
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {
        clientId: 'app-1',
        clientSecret: ciSecret('AZURE_CLIENT_SECRET'),
        subscriptionIds: ['sub-1'],
      },
    });
    await expect(resolve(request('AZURE', 'sub-1'))).resolves.toEqual({
      azure: {spClientId: 'app-1', spClientSecret: 'azure-static-secret'},
    });
    expect(f.masked).toContain('azure-static-secret');
  });

  it('GCP: a service-account key JSON from CI secrets', async () => {
    const f = fakeCi({vars});
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'GCP',
      gcp: {serviceAccountKey: ciSecret('GCP_KEY'), projectIds: ['proj-1']},
    });
    await expect(resolve(request('GCP', 'proj-1'))).resolves.toEqual({
      gcp: {
        serviceAccountEmail: 'key-sa@p.iam.gserviceaccount.com',
        serviceAccountCredentials: vars.GCP_KEY,
      },
    });
    expect(f.masked).toEqual(
      expect.arrayContaining([
        vars.GCP_KEY,
        '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
      ]),
    );
  });

  it('GCP: refuses a key that is not JSON without printing it', async () => {
    const f = fakeCi({vars: {GCP_KEY: 'not-json-secret'}});
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'GCP',
      gcp: {serviceAccountKey: ciSecret('GCP_KEY'), projectIds: ['proj-1']},
    });
    const err = await resolve(request('GCP', 'proj-1')).catch(e => e as Error);
    expect(err.message).toMatch(/GCP_KEY.*not a service-account key/);
    expect(err.message).not.toContain('not-json-secret');
  });

  it('a secret of its own cloud the job was not given fails, naming the variable', async () => {
    const f = fakeCi({vars: {}});
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {
        clientId: 'app-1',
        clientSecret: ciSecret('AZURE_CLIENT_SECRET'),
        subscriptionIds: ['sub-1'],
      },
    });
    const err = await resolve(request('AZURE', 'sub-1')).catch(e => e);
    expect(err).not.toBeInstanceOf(ProviderCredentialsNotConfigured);
    expect((err as Error).message).toMatch(/AZURE_CLIENT_SECRET.*not set/);
  });

  it('mixes OIDC and static per cloud: one shared configuration, one cloud per job', async () => {
    const f = fakeCi({vars});
    const config = {
      azure: {
        clientId: 'app-1',
        clientSecret: ciSecret('AZURE_CLIENT_SECRET'),
        subscriptionIds: ['sub-1'],
      },
      gcp: {
        serviceAccountEmail: 'sa@p.iam.gserviceaccount.com',
        workloadIdentityProvider: WIF,
        projectIds: ['proj-1'],
      },
    };
    const azureJob = credentialsFromCi(f.ci, {...config, cloud: 'AZURE'});
    const gcpJob = credentialsFromCi(f.ci, {...config, cloud: 'gcp'});
    expect((await azureJob(request('AZURE', 'sub-1')))?.azure).toEqual({
      spClientId: 'app-1',
      spClientSecret: 'azure-static-secret',
    });
    expect((await gcpJob(request('GCP', 'proj-1')))?.gcp).toMatchObject({
      federatedToken: 'jwt-1',
    });
  });
});

describe('credentialsFromCi() — what is not configured', () => {
  it('a cloud without configuration is ProviderCredentialsNotConfigured', async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
    });
    const err = await resolve(request('GCP', 'proj-1')).catch(e => e);
    expect(err).toBeInstanceOf(ProviderCredentialsNotConfigured);
    expect((err as ProviderCredentialsNotConfigured).provider).toBe('GCP');
    expect(f.audiences).toHaveLength(0);
  });

  it("a job mints for its own cloud only, even when others are configured", async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'GCP',
      azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
      gcp: {
        serviceAccountEmail: 'sa@p.iam.gserviceaccount.com',
        workloadIdentityProvider: WIF,
        projectIds: ['proj-1'],
      },
    });
    await expect(resolve(request('AZURE', 'sub-1'))).rejects.toBeInstanceOf(
      ProviderCredentialsNotConfigured,
    );
    expect(f.audiences).toHaveLength(0);
    await expect(resolve(request('GCP', 'proj-1'))).resolves.toBeDefined();
  });

  it("refuses a job cloud it has no configuration for, or does not know", () => {
    const f = fakeCi();
    expect(() =>
      credentialsFromCi(f.ci, {
        cloud: 'AWS',
        azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
      }),
    ).toThrow(/cloud 'AWS'.*no aws configuration/);
    expect(() =>
      credentialsFromCi(f.ci, {
        cloud: 'oci' as never,
        azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
      }),
    ).toThrow(/cloud 'oci'.*AWS, GCP or AZURE/);
    expect(() =>
      credentialsFromCi(f.ci, {
        cloud: undefined,
        azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
      }),
    ).toThrow(/no cloud for this job/);
  });

  it('refuses an environment outside the allowlist', async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
      environments: ['mgmt'],
    });
    await expect(
      resolve(request('AZURE', 'sub-1', 'other-env')),
    ).rejects.toThrow(/environment 'other-env'.*not configured/);
    expect(f.audiences).toHaveLength(0);
  });

  it('refuses a configuration that names nothing to refuse against', () => {
    const f = fakeCi();
    expect(() =>
      credentialsFromCi(f.ci, {
      cloud: 'AZURE',
        azure: {clientId: 'app-1', subscriptionIds: []},
      }),
    ).toThrow(/subscriptionIds/);
    expect(() =>
      credentialsFromCi(f.ci, {
      cloud: 'AWS',aws: {roleArn: 'not-an-arn'}}),
    ).toThrow(/roleArn/);
  });

  it('refuses two AWS entries for one account', () => {
    const f = fakeCi();
    expect(() =>
      credentialsFromCi(f.ci, {
      cloud: 'AWS',aws: [{roleArn: ROLE}, {roleArn: ROLE}]}),
    ).toThrow(/111111111111.*more than once/);
  });

  it('never puts a token or secret in an error message', async () => {
    const f = fakeCi({vars: {S: 'top-secret-value'}});
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {
        clientId: 'app-1',
        clientSecret: ciSecret('S'),
        subscriptionIds: ['sub-1'],
      },
    });
    const err = await resolve(request('AZURE', 'sub-9')).catch(e => e as Error);
    expect(err.message).not.toContain('top-secret-value');
  });
});

describe('credentialsFromCi() — review hardening', () => {
  it('refuses a region that is not an AWS region before anything is minted', async () => {
    const f = fakeCi();
    const sts = fakeSts();
    const resolve = credentialsFromCi(
      f.ci,
      {cloud: 'AWS', aws: {roleArn: ROLE}},
      {fetch: sts.fn},
    );
    await expect(
      resolve({...request('AWS', '111111111111'), region: 'x.evil.example/?'}),
    ).rejects.toThrow(/not an AWS region/);
    expect(f.audiences).toHaveLength(0);
    expect(sts.calls).toHaveLength(0);
  });

  it("refuses a region outside the role's partition", async () => {
    const f = fakeCi();
    const sts = fakeSts();
    const resolve = credentialsFromCi(
      f.ci,
      {cloud: 'AWS', aws: {roleArn: 'arn:aws-cn:iam::111111111111:role/Deployer'}},
      {fetch: sts.fn},
    );
    await expect(resolve(request('AWS', '111111111111'))).rejects.toThrow(
      /partition/,
    );
    await resolve({...request('AWS', '111111111111'), region: 'cn-north-1'});
    expect(sts.calls[0].url).toBe('https://sts.cn-north-1.amazonaws.com.cn/');
  });

  it('matches the environment allowlist by full id as well as by short name', async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {clientId: 'app-1', subscriptionIds: ['sub-1']},
      environments: ['Organizational/owner/mgmt'],
    });
    await expect(resolve(request('AZURE', 'sub-1'))).resolves.toBeDefined();
    const personal = {
      ...request('AZURE', 'sub-1'),
      environment: {type: 'Personal' as const, ownerId: 'owner', shortName: 'mgmt'},
    };
    await expect(resolve(personal)).rejects.toThrow(/not configured/);
  });

  it('refuses a workload identity provider that is not a provider resource name', () => {
    const f = fakeCi();
    expect(() =>
      credentialsFromCi(f.ci, {
        cloud: 'GCP',
        gcp: {
          serviceAccountEmail: 'sa@p.iam.gserviceaccount.com',
          workloadIdentityProvider: `//iam.googleapis.com/${WIF}`,
          projectIds: ['proj-1'],
        },
      }),
    ).toThrow(/workloadIdentityProvider/);
  });

  it('matches subscription ids regardless of case', async () => {
    const f = fakeCi();
    const resolve = credentialsFromCi(f.ci, {
      cloud: 'AZURE',
      azure: {
        clientId: 'app-1',
        subscriptionIds: ['4EE3EB42-883B-4F9B-AF8B-275435E50125'],
      },
    });
    await expect(
      resolve(request('AZURE', '4ee3eb42-883b-4f9b-af8b-275435e50125')),
    ).resolves.toBeDefined();
  });
});

describe('signAwsRequest() — SigV4', () => {
  it("matches AWS's published example signature", () => {
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html
    // (the IAM ListUsers example of the Signature Version 4 test suite).
    const headers = signAwsRequest({
      method: 'GET',
      url: 'https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
      },
      body: '',
      region: 'us-east-1',
      service: 'iam',
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      now: new Date('2015-08-30T12:36:00Z'),
    });
    expect(headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, ' +
        'SignedHeaders=content-type;host;x-amz-date, ' +
        'Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7',
    );
    expect(headers['x-amz-date']).toBe('20150830T123600Z');
  });
});
