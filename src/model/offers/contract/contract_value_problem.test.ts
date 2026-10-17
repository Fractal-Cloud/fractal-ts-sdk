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
