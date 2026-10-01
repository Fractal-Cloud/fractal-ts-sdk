/**
 * environment_credentials_redaction.test.ts — credentials from a
 * `providerCredentials` RESOLVER are redacted like static ones.
 *
 * A resolver's credentials do not exist when the deploy starts, so they cannot be
 * in the redaction set collected up front. Against a real local listener (no HTTP
 * mock), this proves they are registered before the request that carries them —
 * and stay registered for LATER requests, which is where a server is likeliest to
 * quote them back (the status poll).
 */
import {describe, it, expect} from 'vitest';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {inspect} from 'node:util';
import {ManagementEnvironment} from './environment/index';
import {createFractalCloudClient} from './client';

const OWNER = '2e114308-14ec-4d77-b610-490324fa1844';
const SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYRESOLVEDKEY';
const TOKEN = 'IQoJb3JpZ2luX2VjEXAMPLESESSIONTOKENVALUE';

const tree = () =>
  ManagementEnvironment({
    id: {type: 'Personal', ownerId: OWNER, shortName: 'mgmt'},
    resourceGroups: [`Personal/${OWNER}/mgmt-rg`],
  }).withAwsCloudAgent({
    region: 'eu-central-1',
    organizationId: 'o-abc',
    accountId: '111111111111',
  });

/** Serve the deploy flow; `onInit` / `onPoll` decide how the server misbehaves. */
const withServer = async (
  handlers: {
    onInit: (req: IncomingMessage, res: ServerResponse) => void;
    onPoll: (res: ServerResponse, round: number) => void;
  },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> => {
  let polls = 0;
  const server = createServer((req, res) => {
    const url = req.url ?? '';
    const json = (status: number, body?: unknown) => {
      res.writeHead(status, {'content-type': 'application/json'});
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    if (url.endsWith('/initialize')) {
      handlers.onInit(req, res);
    } else if (url.endsWith('/status')) {
      // The pre-start status read, then the wait-mode polls.
      if (polls++ === 0) {
        json(404);
      } else {
        handlers.onPoll(res, polls - 1);
      }
    } else if (req.method === 'GET') {
      json(404);
    } else {
      json(201, {});
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as {port: number};
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
};

const resolver = async () => ({
  aws: {accessKeyId: 'AKIAEXAMPLE', secretAccessKey: SECRET, sessionToken: TOKEN},
});

describe('resolver credentials are redacted', () => {
  it('from the initialize response that echoes them', async () => {
    let printed = '(nothing thrown)';
    await withServer(
      {
        onInit: (req, res) => {
          res.writeHead(400, {'content-type': 'application/json'});
          res.end(
            JSON.stringify({
              reasonCode: 'InvalidCredentials',
              message: `rejected key ${String(req.headers['x-aws-secret-access-key'])} / ${String(req.headers['x-aws-session-token'])}`,
            }),
          );
        },
        onPoll: res => res.end(),
      },
      async baseUrl => {
        const cloud = createFractalCloudClient({
          clientId: 'cid',
          clientSecret: 'csecret',
          baseUrl,
        });
        try {
          await cloud.environments.deploy(tree(), {
            quiet: true,
            providerCredentials: resolver,
          });
        } catch (err) {
          printed = inspect(err, {depth: null});
        }
      },
    );
    expect(printed).toContain('InvalidCredentials');
    expect(printed).not.toContain(SECRET);
    expect(printed).not.toContain(TOKEN);
    expect(printed).toContain('REDACTED');
  });

  it('from a LATER request that never carried them (the status poll)', async () => {
    let printed = '(nothing thrown)';
    await withServer(
      {
        onInit: (_req, res) => {
          res.writeHead(202, {'content-type': 'application/json'});
          res.end('{}');
        },
        onPoll: res => {
          res.writeHead(500, {'content-type': 'application/json'});
          res.end(
            JSON.stringify({message: `the credentials ${SECRET} are invalid`}),
          );
        },
      },
      async baseUrl => {
        const cloud = createFractalCloudClient({
          clientId: 'cid',
          clientSecret: 'csecret',
          baseUrl,
        });
        try {
          await cloud.environments.deploy(tree(), {
            quiet: true,
            agentInit: 'wait',
            pollIntervalMs: 1,
            timeoutMs: 5_000,
            providerCredentials: resolver,
          });
        } catch (err) {
          printed = inspect(err, {depth: null});
        }
      },
    );
    expect(printed).toContain('HTTP 500');
    expect(printed).not.toContain(SECRET);
    expect(printed).toContain('REDACTED');
  });
});
