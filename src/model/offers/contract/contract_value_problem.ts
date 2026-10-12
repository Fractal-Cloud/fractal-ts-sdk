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
  const param = contract.params[key];
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
  const shown = JSON.stringify(value);
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
