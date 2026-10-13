import type {SecretRef} from '../../secret';

/**
 * The TypeScript type of a value for one contract parameter. A closed
 * vocabulary becomes a union of literals unless the agent only warns about
 * other values or compares them case-insensitively; a sensitive key also takes
 * an environment-secret reference.
 */
export type ContractValue<P> = (
  P extends {readonly type: 'string'}
    ? P extends {readonly values: readonly (infer V)[]}
      ? P extends
          | {readonly valuesLevel: 'warn'}
          | {readonly valuesCaseInsensitive: true}
        ? string
        : V
      : string
    : P extends {readonly type: 'integer' | 'number'}
      ? number
      : P extends {readonly type: 'boolean'}
        ? boolean
        : P extends {readonly type: 'array'}
          ? P extends {readonly values: readonly (infer V)[]}
            ? P extends
                | {readonly valuesLevel: 'warn'}
                | {readonly valuesCaseInsensitive: true}
              ? readonly string[]
              : readonly V[]
            : readonly unknown[]
          : Readonly<Record<string, unknown>>
) extends infer T
  ? P extends {readonly sensitive: true}
    ? T | SecretRef
    : T
  : never;
