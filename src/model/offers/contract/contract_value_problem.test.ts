/**
 * contract_value_problem.test.ts — a refusal never echoes a secret.
 *
 * A translated value the contract would not take is refused with a message
 * naming the key and the problem. The value itself is shown only when the
 * parameter is neither marked `sensitive` nor named like a secret: an agent
 * contract may leave a password or pre-shared key unmarked, so the key name is
 * checked too.
 */
import {describe, expect, it} from 'vitest';
import {contractValueProblem} from './contract_value_problem';
import type {OfferContract} from './offer_contract';

const contract = {
  offerType: 'Test.IaaS.Secrets',
  serviceTypes: ['Test.IaaS.Secrets'],
  declaredBy: [
    {
      agentId: 'test-agent',
      agentVersion: 'v1.0.0',
      contractSchemaVersion: '2.0',
      provider: 'AWS',
      parameterRules: [],
    },
  ],
  params: {
    marked: {type: 'string', required: false, sensitive: true},
    markedChoice: {
      type: 'string',
      required: false,
      sensitive: true,
      values: ['a', 'b'],
    },
    markedShape: {
      type: 'string',
      required: false,
      sensitive: true,
      constraints: {pattern: '[a-z]+'},
    },
    password: {type: 'string', required: false, constraints: {minLength: 40}},
    presharedKey: {type: 'number', required: false},
    clientSecret: {type: 'string', required: false, values: ['x']},
    apiToken: {type: 'string', required: false, constraints: {maxLength: 2}},
    plain: {type: 'string', required: false, values: ['small', 'large']},
    count: {type: 'integer', required: false, constraints: {maximum: 5}},
    enabled: {type: 'string', required: false},
    storageAccountConnectionString: {type: 'string', required: false},
    userData: {type: 'integer', required: false},
    backendStoreUri: {
      type: 'string',
      required: false,
      constraints: {pattern: 'postgres://.*'},
    },
    sshRepositoryURI: {type: 'string', required: false, values: ['x']},
    forwardAuthAddress: {type: 'number', required: false},
    tlsCertificates: {type: 'string', required: false},
    sasPolicy: {type: 'string', required: false},
    env: {type: 'string', required: false},
  },
} as const satisfies OfferContract;

const SECRET = 'hunter2-S3cr3t';

describe('contractValueProblem constraints (aria-spec tests/contract/SPEC.md)', () => {
  const shapes = {
    offerType: 'Test.PaaS.Shapes',
    serviceTypes: ['Test.PaaS.Shapes'],
    declaredBy: [
      {
        agentId: 'test-agent',
        agentVersion: 'v1.0.0',
        contractSchemaVersion: '2.0',
        provider: 'AWS',
        parameterRules: [],
      },
    ],
    params: {
      // fractal-cloud-agent-aws Storage.PaaS.AwsS3 `bucket`
      bucket: {
        type: 'string',
        required: false,
        constraints: {pattern: '[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]'},
      },
      aliases: {
        type: 'array',
        required: false,
        constraints: {pattern: '[a-z0-9.-]+', minItems: 1, maxItems: 2},
      },
    },
  } as const satisfies OfferContract;

  it('matches a pattern against the whole value, not a part of it', () => {
    expect(contractValueProblem(shapes, 'bucket', 'my-bucket')).toBeUndefined();
    expect(
      contractValueProblem(shapes, 'bucket', 'BAD!!!' + 'a'.repeat(20)),
    ).toBe("'bucket' (value withheld) does not match [a-z0-9][a-z0-9.-]{1,61}[a-z0-9]");
    expect(contractValueProblem(shapes, 'bucket', 'ok-bucket!')).toMatch(
      /does not match/,
    );
  });

  it('matches an array pattern against each item with a rendering', () => {
    expect(
      contractValueProblem(shapes, 'aliases', ['a.example.com', 'b.example.com']),
    ).toBeUndefined();
    expect(
      contractValueProblem(shapes, 'aliases', ['a.example.com', 'Not A Host']),
    ).toBe("'aliases' item 1 does not match [a-z0-9.-]+");
    // A reference or a non-scalar item is skipped.
    expect(
      contractValueProblem(shapes, 'aliases', [{$envSecret: 'x'}]),
    ).toBeUndefined();
  });

  it('bounds the number of items', () => {
    expect(contractValueProblem(shapes, 'aliases', [])).toBe(
      "'aliases' has fewer than 1 items",
    );
    expect(contractValueProblem(shapes, 'aliases', ['a', 'b', 'c'])).toBe(
      "'aliases' has more than 2 items",
    );
  });
});

describe('contractValueProblem and inherited names', () => {
  it.each(['constructor', '__proto__', 'toString'])(
    'reads %s as a key the contract does not declare',
    key => {
      expect(contractValueProblem(contract, key, 'x')).toBe(
        `Test.IaaS.Secrets declares no '${key}'`,
      );
    },
  );
});

describe('contractValueProblem and keys only some agents read', () => {
  it('refuses a key that another agent declaring the offer ignores, naming both', () => {
    const shared = {
      offerType: 'Test.CaaS.Shared',
      serviceTypes: ['Test.CaaS.Shared'],
      declaredBy: [
        {agentId: 'a', agentVersion: 'v1', contractSchemaVersion: '2.0', provider: 'CaaS', parameterRules: []},
        {agentId: 'b', agentVersion: 'v1', contractSchemaVersion: '2.0', provider: 'CaaS', parameterRules: []},
      ],
      params: {onlyA: {type: 'integer', required: false, agents: ['a']}},
    } as const satisfies OfferContract;
    expect(contractValueProblem(shared, 'onlyA', 1)).toBe(
      "'onlyA' is read only by a; b also reconciles Test.CaaS.Shared and ignores it",
    );
  });
});

describe('contractValueProblem never echoes a secret', () => {
  it.each([
    ['marked', 42],
    ['markedChoice', SECRET],
    ['markedShape', SECRET],
    ['password', SECRET],
    ['presharedKey', SECRET],
    ['clientSecret', SECRET],
    ['apiToken', SECRET],
  ])('redacts the value of %s', (key, value) => {
    const problem = contractValueProblem(contract, key, value);
    expect(problem, key).toBeDefined();
    expect(problem).not.toContain(SECRET);
    expect(problem).not.toContain('42');
    expect(problem).toContain(`'${key}'`);
    expect(problem).toContain('(value withheld: secret)');
  });

  // Default deny: a value is shown only when it is a number or a boolean, or a
  // string the contract checks against a closed vocabulary. Anything else may
  // carry a credential the contract does not mark.
  it.each([
    ['storageAccountConnectionString', 7, 'secret'],
    ['userData', `#!/bin/sh\nexport TOKEN=${SECRET}`],
    ['backendStoreUri', `mysql://admin:${SECRET}@db/mlflow`],
    ['sshRepositoryURI', `git@host:${SECRET}.git`],
    ['forwardAuthAddress', `https://u:${SECRET}@auth`],
    ['tlsCertificates', [{key: SECRET}]],
    ['sasPolicy', {primaryKey: SECRET}],
    ['env', {DB_PASSWORD: SECRET}],
  ])('withholds the value of %s', (key, value, why?: string) => {
    const problem = contractValueProblem(contract, key, value);
    expect(problem, key).toBeDefined();
    expect(problem).not.toContain(SECRET);
    expect(problem).not.toMatch(/\b7\b/);
    expect(problem).toContain(
      why === undefined ? '(value withheld)' : `(value withheld: ${why})`,
    );
    expect(problem).toContain(`'${key}'`);
  });

  it('shows a number and a boolean, which carry no credential', () => {
    expect(contractValueProblem(contract, 'count', 9)).toBe(
      "'count' 9 is above 5",
    );
    expect(contractValueProblem(contract, 'enabled', true)).toBe(
      "true is not the string 'enabled' takes",
    );
  });

  it('shows the value of a parameter that is not a secret', () => {
    expect(contractValueProblem(contract, 'plain', 'huge')).toBe(
      '"huge" is not one of small, large for \'plain\'',
    );
  });
});
