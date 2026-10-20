import type {NeutralRule} from './neutral_rule';

/** Neutral parameters set by a setter not named after them. */
const SETTERS: Readonly<Record<string, string>> = {
  maxSurge: 'withRollout',
  maxUnavailable: 'withRollout',
};

/** The component setter that sets the neutral parameter `key`. */
export const neutralSetterName = (key: string): string =>
  SETTERS[key] ?? `with${key.charAt(0).toUpperCase()}${key.slice(1)}`;

/** Is a parameter supplied at all? */
const isSet = (v: unknown): boolean => v !== undefined;

/**
 * Applies an offer's neutral rules to a component's neutral parameters, before
 * the offer instantiates it. A translated value moves to its contract key; an
 * explicit vendor value (offer config or a dev-set parameter) wins over an
 * open neutral one and is refused against a locked one, as the lock would
 * otherwise guard a value nobody reads. When two neutral parameters translate
 * to the same key, the rule listed first wins (e.g. a Container App's
 * `autoscaling` range over its `replicas`), unless the later rule merges into
 * it (a workload's `env` and `secretEnv`, both its container environment). An
 * unsupported parameter is refused.
 */
export const applyNeutralRules = (args: {
  offerType: string;
  componentId: string;
  parameters: Readonly<Record<string, unknown>>;
  locked: readonly string[];
  config: unknown;
  rules: Readonly<Record<string, NeutralRule>> | undefined;
}): Record<string, unknown> => {
  const params: Record<string, unknown> = {...args.parameters};
  const config = (args.config ?? {}) as Record<string, unknown>;
  const translated = new Set<string>();
  for (const [key, rule] of Object.entries(args.rules ?? {})) {
    if (!(key in params)) {
      continue;
    }
    const value = params[key];
    delete params[key];
    // An unsupported key is refused even when its value is undefined (set past
    // the type): the call is the mistake, whatever its value.
    if (rule.kind !== 'unsupported' && !isSet(value)) {
      continue;
    }
    const setter = neutralSetterName(key);
    const locked = args.locked.includes(key);
    const refused = (why: string, fixes: readonly string[]): Error => {
      const remove = locked
        ? `remove ${setter} from '${args.componentId}' in the Fractal`
        : `stop setting '${key}' on '${args.componentId}' (the Fractal or ` +
          'the operation that sets it)';
      return new Error(
        `Offer ${args.offerType}, selected for '${args.componentId}', cannot ` +
          `honor ${setter} ('${key}'), a ` +
          `${locked ? 'guardrail locked' : 'parameter open'} in the Fractal: ` +
          `${why.replace(/\.$/, '')}. Fix: ${[...fixes, `or ${remove}`].join(', ')}.`,
      );
    };
    if (rule.kind === 'unsupported') {
      if (rule.satisfiedBy?.(value)) {
        continue;
      }
      throw refused(rule.reason, [
        `select an offer for '${args.componentId}' whose agent supports ${setter}`,
      ]);
    }
    let vendorValues: Readonly<Record<string, unknown>>;
    try {
      vendorValues = rule.apply(value);
    } catch (e) {
      throw refused(e instanceof Error ? e.message : String(e), [
        `give ${setter} a value ${args.offerType} accepts`,
        `select an offer for '${args.componentId}' whose agent supports it`,
      ]);
    }
    for (const [vendorKey, vendorValue] of Object.entries(vendorValues)) {
      if (!isSet(vendorValue)) {
        continue;
      }
      if (translated.has(vendorKey)) {
        if (rule.merge !== undefined) {
          try {
            params[vendorKey] = rule.merge(params[vendorKey], vendorValue);
          } catch (e) {
            throw refused(e instanceof Error ? e.message : String(e), [
              `give ${setter} a value ${args.offerType} accepts`,
            ]);
          }
        }
        continue;
      }
      if (isSet(config[vendorKey]) || isSet(params[vendorKey])) {
        if (args.locked.includes(key)) {
          throw new Error(
            `Parameter '${key}' on '${args.componentId}' is a locked guardrail, ` +
              `and '${vendorKey}' sets the same thing under the name ` +
              `${args.offerType} reads. Setting it would override the locked ` +
              `value without the lock noticing. Remove the '${vendorKey}' ` +
              'override, or drop the guardrail if the value is meant to be dev-open.',
          );
        }
        continue;
      }
      params[vendorKey] = vendorValue;
      translated.add(vendorKey);
    }
  }
  return params;
};
