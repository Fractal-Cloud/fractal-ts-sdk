import type {ContractParameter} from './contract_parameter';
import type {OfferContract} from './offer_contract';

const TYPE_CHECKS: Readonly<Record<string, (v: unknown) => boolean>> = {
  string: v => typeof v === 'string',
  integer: v => typeof v === 'number' && Number.isInteger(v),
  number: v => typeof v === 'number' && Number.isFinite(v),
  boolean: v => typeof v === 'boolean',
  array: v => Array.isArray(v),
  object: v => typeof v === 'object' && v !== null && !Array.isArray(v),
};

type Constraints = {
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly level?: 'error' | 'warn';
};

const inVocabulary = (param: ContractParameter, value: unknown): boolean => {
  const fold = (s: string) =>
    param.valuesCaseInsensitive ? s.trim().toLowerCase() : s.trim();
  return (param.values ?? []).some(
    allowed => typeof value === 'string' && fold(allowed) === fold(value),
  );
};

const constraintProblem = (
  constraints: Constraints,
  value: unknown,
): string | undefined => {
  if (constraints.level === 'warn') {
    return undefined;
  }
  if (typeof value === 'string') {
    if (
      constraints.pattern !== undefined &&
      !new RegExp(`^(?:${constraints.pattern})$`).test(value.trim())
    ) {
      return `does not match ${constraints.pattern}`;
    }
    if (
      constraints.minLength !== undefined &&
      value.length < constraints.minLength
    ) {
      return `is shorter than ${constraints.minLength}`;
    }
    if (
      constraints.maxLength !== undefined &&
      value.length > constraints.maxLength
    ) {
      return `is longer than ${constraints.maxLength}`;
    }
  }
  if (typeof value === 'number') {
    if (constraints.minimum !== undefined && value < constraints.minimum) {
      return `is below ${constraints.minimum}`;
    }
    if (constraints.maximum !== undefined && value > constraints.maximum) {
      return `is above ${constraints.maximum}`;
    }
  }
  return undefined;
};

/**
 * Key names that hold a secret whatever the contract says: an agent may leave
 * a password or pre-shared key unmarked. An extra guard on top of the default
 * deny below.
 */
const SECRET_KEY =
  /pass(word|phrase)?|secret|token|credential|private.?key|pre.?shared|psk|api.?key|access.?key|signing.?key|connection.?string/i;

/** A vocabulary value: an identifier, with no room for a URL, user info or key. */
const VOCABULARY_SHAPE = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * How a refusal shows the value. Default deny: only a number or a boolean, or
 * an identifier-shaped string checked against a closed vocabulary, of a
 * parameter neither marked `sensitive` nor named like a secret. Any other
 * string, object or array may carry a credential the contract does not mark
 * (a connection string, user data, a URI with user info), so it is withheld
 * and the message says only what was expected.
 */
const shownValue = (
  key: string,
  param: ContractParameter,
  value: unknown,
): string => {
  if (param.sensitive === true || SECRET_KEY.test(key)) {
    return '(value withheld: secret)';
  }
  if (
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' &&
      param.values !== undefined &&
      VOCABULARY_SHAPE.test(value.trim()))
  ) {
    return JSON.stringify(value);
  }
  return '(value withheld)';
};

/**
 * Why `value` is not one the contract accepts for `key`, or undefined when it
 * is. Checks what the contract carries: that every agent declaring the offer
 * reads the key, its type, its closed vocabulary and its value constraints
 * (levels `warn` are not refusals). Used on every value a neutral translation
 * produces, so a translation cannot hand an agent a value it rejects.
 */
export const contractValueProblem = (
  contract: OfferContract,
  key: string,
  value: unknown,
): string | undefined => {
  const param = Object.hasOwn(contract.params, key)
    ? contract.params[key]
    : undefined;
  if (param === undefined) {
    return `${contract.offerType} declares no '${key}'`;
  }
  if (param.agents !== undefined) {
    const others = contract.declaredBy
      .map(d => d.agentId)
      .filter(a => !param.agents!.includes(a));
    return (
      `'${key}' is read only by ${param.agents.join(', ')}; ` +
      `${others.join(', ')} also reconcile${others.length === 1 ? 's' : ''} ` +
      `${contract.offerType} and ignore${others.length === 1 ? 's' : ''} it`
    );
  }
  const shown = shownValue(key, param, value);
  if (!TYPE_CHECKS[param.type](value)) {
    return `${shown} is not the ${param.type} '${key}' takes`;
  }
  if (
    param.values !== undefined &&
    param.valuesLevel !== 'warn' &&
    !(Array.isArray(value) ? value : [value]).every(v => inVocabulary(param, v))
  ) {
    return `${shown} is not one of ${param.values.join(', ')} for '${key}'`;
  }
  const problem =
    param.constraints === undefined
      ? undefined
      : constraintProblem(param.constraints as Constraints, value);
  return problem === undefined ? undefined : `'${key}' ${shown} ${problem}`;
};
