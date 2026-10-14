/**
 * apply_neutral_rules.test.ts — the refusal of a neutral parameter the selected
 * offer cannot honor must tell the caller what to fix: it names the component,
 * the guardrail (or parameter), the selected offer, and the two ways out —
 * select an offer whose agent supports it, or remove it.
 */
import {describe, it, expect} from 'vitest';
import {applyNeutralRules, neutralSetterName} from './apply_neutral_rules';
import * as model from './index';
import {unsupported} from './offers/neutral_rules';
import type {NeutralRule} from './neutral_rule';

const refusal = (args: {
  locked: readonly string[];
  rules: Readonly<Record<string, NeutralRule>>;
  parameters: Readonly<Record<string, unknown>>;
}): string => {
  try {
    applyNeutralRules({
      offerType: 'APIManagement.PaaS.AwsCloudFront',
      componentId: 'api-gateway',
      config: {},
      ...args,
    });
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected a refusal');
};

describe('applyNeutralRules refusals', () => {
  it('names the component, the guardrail, the offer and the fix for a locked guardrail', () => {
    const message = refusal({
      locked: ['httpsOnly'],
      parameters: {httpsOnly: true},
      rules: {httpsOnly: unsupported('the agent reads no HTTPS-only switch')},
    });
    expect(message).toBe(
      "Offer APIManagement.PaaS.AwsCloudFront, selected for 'api-gateway', " +
        "cannot honor withHttpsOnly ('httpsOnly'), a guardrail locked in the " +
        'Fractal: the agent reads no HTTPS-only switch. Fix: select an offer ' +
        "for 'api-gateway' whose agent supports withHttpsOnly, or remove " +
        "withHttpsOnly from 'api-gateway' in the Fractal.",
    );
  });

  it('names the parameter and where to remove it when it is not a guardrail', () => {
    const message = refusal({
      locked: [],
      parameters: {rateLimit: {requestsPerSecond: 10}},
      rules: {rateLimit: unsupported('the agent reads no rate limit')},
    });
    expect(message).toBe(
      "Offer APIManagement.PaaS.AwsCloudFront, selected for 'api-gateway', " +
        "cannot honor withRateLimit ('rateLimit'), a parameter open in the " +
        'Fractal: the agent reads no rate limit. Fix: select an offer for ' +
        "'api-gateway' whose agent supports withRateLimit, or stop setting " +
        "'rateLimit' on 'api-gateway' (the Fractal or the operation that sets it).",
    );
  });

  it('says how to fix a value the offer cannot translate', () => {
    const message = refusal({
      locked: ['size'],
      parameters: {size: 'huge'},
      rules: {
        size: {
          kind: 'translate',
          apply: () => {
            throw new Error("'huge' is not small, medium, large or xlarge.");
          },
        },
      },
    });
    expect(message).toBe(
      "Offer APIManagement.PaaS.AwsCloudFront, selected for 'api-gateway', " +
        "cannot honor withSize ('size'), a guardrail locked in the Fractal: " +
        "'huge' is not small, medium, large or xlarge. Fix: give withSize a " +
        'value APIManagement.PaaS.AwsCloudFront accepts, select an offer for ' +
        "'api-gateway' whose agent supports it, or remove withSize from " +
        "'api-gateway' in the Fractal.",
    );
  });

  it('names the rollout setter for its two parameters', () => {
    expect(neutralSetterName('maxSurge')).toBe('withRollout');
    expect(neutralSetterName('maxUnavailable')).toBe('withRollout');
    expect(neutralSetterName('retentionDays')).toBe('withRetentionDays');
  });

  it('names a setter that exists for every parameter an offer refuses', () => {
    const setters = new Set<string>();
    for (const [name, factory] of Object.entries(model)) {
      if (typeof factory !== 'function' || !/^[A-Z]/.test(name)) {
        continue;
      }
      let node: unknown;
      try {
        node = (factory as (cfg: unknown) => unknown)({id: 'x', subnets: [{}]});
      } catch {
        continue;
      }
      if (typeof node === 'object' && node !== null && 'state' in node) {
        for (const key of Object.keys(node)) {
          if (key.startsWith('with')) {
            setters.add(key);
          }
        }
      }
    }
    const refused = Object.values(model).flatMap(offer => {
      const neutral = (offer as {neutral?: Record<string, NeutralRule>})
        .neutral;
      return typeof offer === 'function' && neutral !== undefined
        ? Object.keys(neutral)
        : [];
    });
    expect(refused.length).toBeGreaterThan(50);
    expect(
      [...new Set(refused)].filter(k => !setters.has(neutralSetterName(k))),
    ).toEqual([]);
  });
});
