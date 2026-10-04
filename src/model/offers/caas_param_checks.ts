/**
 * Parameter checks shared by the caas-k8s offers, each mirroring what the agent
 * (or the Kubernetes API behind it) refuses, so a Live System it would fail is
 * refused while it is being built instead of after it was deployed.
 *
 * Internal: not re-exported from the model barrel.
 */

/** A Kubernetes object name (RFC 1123 subdomain): what a Secret, ClusterIssuer or StorageClass is called. */
const DNS1123_SUBDOMAIN =
  /^(?=.{1,253}$)[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
/** A Kubernetes namespace name (RFC 1123 label). */
const DNS1123_LABEL = /^(?=.{1,63}$)[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
/** An absolute http(s) URL with a host, as Go's url.Parse plus a scheme and host check accepts one. */
const HTTP_URL = /^https?:\/\/[^\s/?#]+([/?#]\S*)?$/i;
const IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

/** Throw the error every caas-k8s offer check throws, naming the component. */
export const refuse = (id: string, why: string): never => {
  throw new Error(`Live component '${id}': ${why}.`);
};

export const isKubernetesName = (value: string): boolean =>
  DNS1123_SUBDOMAIN.test(value);

export const isNamespaceName = (value: string): boolean =>
  DNS1123_LABEL.test(value);

export const isHttpUrl = (value: string): boolean => HTTP_URL.test(value);

export const isWholeAtLeastOne = (value: number): boolean =>
  Number.isInteger(value) && value >= 1;

/**
 * The number of 16-bit groups `groups` stand for, or undefined when one is
 * malformed. A dotted IPv4 group counts as two, and only as the last group of
 * the whole address (`v4Tail`).
 */
const groupCount = (
  groups: readonly string[],
  v4Tail: boolean,
): number | undefined => {
  let count = 0;
  for (const [i, group] of groups.entries()) {
    if (v4Tail && i === groups.length - 1 && group.includes('.')) {
      if (!IPV4.test(group)) {
        return undefined;
      }
      count += 2;
    } else if (HEX_GROUP.test(group)) {
      count += 1;
    } else {
      return undefined;
    }
  }
  return count;
};

const isIpv6 = (value: string): boolean => {
  const halves = value.split('::');
  if (halves.length > 2) {
    return false;
  }
  if (halves.length === 1) {
    return groupCount(value.split(':'), true) === 8;
  }
  const [head, tail] = halves;
  const headCount = head === '' ? 0 : groupCount(head.split(':'), false);
  const tailCount = tail === '' ? 0 : groupCount(tail.split(':'), true);
  if (headCount === undefined || tailCount === undefined) {
    return false;
  }
  return headCount + tailCount < 8;
};

/** An IPv4 or IPv6 CIDR block, as Go's `net.ParseCIDR` (which the agent uses) reads one. */
export const isCidr = (value: string): boolean => {
  const slash = value.lastIndexOf('/');
  if (slash < 0) {
    return false;
  }
  const address = value.slice(0, slash);
  const prefix = value.slice(slash + 1);
  if (!/^\d{1,3}$/.test(prefix)) {
    return false;
  }
  const bits = Number(prefix);
  if (IPV4.test(address)) {
    return bits <= 32;
  }
  return address.includes(':') && isIpv6(address) && bits <= 128;
};

/** Refuse a namespace that is not a Kubernetes namespace name. */
export const ensureNamespace = (id: string, namespace?: string): void => {
  if (namespace !== undefined && !isNamespaceName(namespace)) {
    refuse(id, `namespace '${namespace}' is not a Kubernetes namespace name`);
  }
};
