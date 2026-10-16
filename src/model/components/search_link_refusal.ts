/**
 * search_link_refusal.ts — why the agent of a `Storage.Search` component would
 * refuse a link's settings, or `undefined` when it accepts them.
 *
 * Mirrors the target's own checks (see `SearchLink`): `access` is required and
 * one of `read`, `write`, `read-write`; the catalogue spelling `accessMode`
 * (`read` / `write` / `readWrite`) is accepted when `access` is absent, and
 * `access` wins when both are set. `indexPrefix`, when set, is lower-case
 * letters, digits and `-_.` only: no blank prefix, no wildcard, no upper case.
 */
const ACCESS = ['read', 'write', 'read-write'];
const ACCESS_MODE = ['read', 'write', 'readWrite'];
const INDEX_PREFIX = /^[a-z0-9._-]+$/;

export const searchLinkRefusal = (
  settings: Readonly<Record<string, unknown>>,
): string | undefined => {
  const access = settings.access;
  if (access === undefined) {
    const mode = settings.accessMode;
    if (mode === undefined) {
      return "it sets no access: set access to 'read', 'write' or 'read-write'";
    }
    if (typeof mode !== 'string' || !ACCESS_MODE.includes(mode)) {
      return `accessMode '${String(mode)}' is not one of ${ACCESS_MODE.join(', ')}`;
    }
  } else if (typeof access !== 'string' || !ACCESS.includes(access)) {
    return `access '${String(access)}' is not one of ${ACCESS.join(', ')}`;
  }
  const prefix = settings.indexPrefix;
  if (prefix === undefined) {
    return undefined;
  }
  if (typeof prefix !== 'string' || prefix.trim() === '') {
    return 'indexPrefix is blank: omit it for the default <consumerId>-';
  }
  if (!INDEX_PREFIX.test(prefix)) {
    return (
      `indexPrefix '${prefix}' may hold only lower-case letters, digits and -_. ` +
      '(no wildcards, no upper case)'
    );
  }
  return undefined;
};
