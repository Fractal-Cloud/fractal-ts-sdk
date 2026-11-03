/**
 * parameter_value.ts — what a parameter value IS, shared by every check that
 * compares a value or asks whether one is set: a key set to `undefined` is not
 * set, at any depth, as it is not sent.
 */
import {isDeepStrictEqual} from 'node:util';

export const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    return false;
  }
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Did a plain object set keys, all of them (at any depth) to undefined? Such an
 * object sets nothing. A literal `{}` is not one: it is sent as written, and the
 * agents read it as a request (an Azure `networkRuleSet: {}`, a caas-k8s
 * `podDisruptionBudget: {}`).
 */
const isEmptied = (v: unknown): boolean =>
  isPlainObject(v) &&
  Object.keys(v).length > 0 &&
  Object.values(v).every(m => m === undefined || isEmptied(m));

/**
 * The value as it is sent: keys whose value is undefined dropped at every depth
 * of plain objects (`{cpu: '1', memory: undefined}` is `{cpu: '1'}`), and so is
 * a member left with nothing set (`{limits: {cpu: undefined}}` is `{}`). A
 * literal `{}` is kept. Arrays keep their positions.
 */
export const withoutUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(e => withoutUndefined(e)) as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined && !isEmptied(v))
      .map(([k, v]) => [k, withoutUndefined(v)]),
  ) as T;
};

/**
 * The same parameter value, keys set to undefined ignored at every depth. A list
 * also equals its comma-separated form: some offers send lists that way, so a
 * locked `'a,b'` is repeated by `['a', 'b']`.
 */
export const sameValue = (rawA: unknown, rawB: unknown): boolean => {
  const a = withoutUndefined(rawA);
  const b = withoutUndefined(rawB);
  return (
    isDeepStrictEqual(a, b) ||
    (Array.isArray(a) && typeof b === 'string' && a.join(',') === b) ||
    (Array.isArray(b) && typeof a === 'string' && b.join(',') === a)
  );
};

/**
 * Is a parameter value set at all? Not when undefined, and not when it is an
 * object whose every key is undefined (`{cpu: undefined}`). A literal `{}` IS
 * set. The one definition every "vendor or neutral value wins" decision uses.
 */
export const isSetValue = (v: unknown): boolean =>
  v !== undefined && !isEmptied(v);
