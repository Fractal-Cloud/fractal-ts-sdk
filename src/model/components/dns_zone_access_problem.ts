/**
 * components/dns_zone_access_problem.ts — the shape checks of DNS zone access
 * maps, shared by a component's `dnsZones` and an environment zone's
 * `componentAccess`. They refuse only what the control plane refuses too: a
 * value that cannot be read without guessing. Internal: not re-exported from
 * the model barrel.
 */

const GRANTABLE: readonly string[] = [
  'A',
  'AAAA',
  'CAA',
  'CNAME',
  'MX',
  'PTR',
  'SRV',
  'TXT',
];
const LEVELS: readonly string[] = ['none', 'read', 'write'];

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Why `value` cannot be a DNS zone access map, or undefined when it can. Keys
 * are `'*'` or a grantable record type and levels `none`, `read` or `write`,
 * both read ignoring case, as the control plane reads them. A `ceiling` also
 * refuses a per-type `read`: it cannot be honored per type, and reading it as
 * whole-zone read would widen what the zone's owner allowed.
 */
export const dnsZoneAccessProblem = (
  value: unknown,
  kind: 'request' | 'ceiling',
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isObject(value)) {
    return (
      `${JSON.stringify(value)} is not a map of record types ('*' or one of ` +
      `${GRANTABLE.join(', ')}) to access levels (none, read, write)`
    );
  }
  const seen = new Set<string>();
  for (const [key, level] of Object.entries(value)) {
    const trimmed = key.trim();
    const type = trimmed === '*' ? '*' : trimmed.toUpperCase();
    if (type !== '*' && !GRANTABLE.includes(type)) {
      return (
        `'${key}' is not a record type access can be granted on; use '*' or ` +
        `one of ${GRANTABLE.join(', ')}`
      );
    }
    if (seen.has(type)) {
      return `names '${type}' more than once`;
    }
    seen.add(type);
    const name = typeof level === 'string' ? level.trim().toLowerCase() : '';
    if (!LEVELS.includes(name)) {
      return `${JSON.stringify(level)} is not an access level (set for '${key}'); use none, read or write`;
    }
    if (kind === 'ceiling' && type !== '*' && name === 'read') {
      return (
        `sets 'read' on ${type}: any access reads the whole zone, so read is ` +
        "allowed for every type at once ('*': 'read') and a type is set to write or none"
      );
    }
  }
  return undefined;
};

/** A zone name as the control plane compares them: trimmed, lower case, no trailing dot. */
const canonicalZoneName = (name: string): string =>
  name.trim().replace(/\.$/, '').toLowerCase();

/**
 * Why `value` cannot be a component's `dnsZones`, or undefined when it can: a
 * list of `{name, access}`, one entry per zone.
 */
export const dnsZoneRequestsProblem = (value: unknown): string | undefined => {
  if (!Array.isArray(value)) {
    return `${JSON.stringify(value)} is not a list of {name, access} entries`;
  }
  const names = new Set<string>();
  for (const entry of value) {
    if (!isObject(entry)) {
      return `${JSON.stringify(entry)} is not a {name, access} entry`;
    }
    const name =
      typeof entry.name === 'string' ? canonicalZoneName(entry.name) : '';
    if (name === '') {
      return `the entry ${JSON.stringify(entry)} names no zone`;
    }
    if (names.has(name)) {
      return `names the zone '${name}' twice; give one entry per zone`;
    }
    names.add(name);
    const problem = dnsZoneAccessProblem(entry.access, 'request');
    if (problem !== undefined) {
      return `access of '${name}': ${problem}`;
    }
  }
  return undefined;
};
