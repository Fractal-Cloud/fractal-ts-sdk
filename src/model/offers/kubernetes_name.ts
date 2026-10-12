/** A Kubernetes object name (RFC 1123 subdomain): what a Secret, ClusterIssuer or Service is called. */
const DNS1123_SUBDOMAIN =
  /^(?=.{1,253}$)[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

/** Is `value` a Kubernetes object name? */
export const isKubernetesName = (value: string): boolean =>
  DNS1123_SUBDOMAIN.test(value);
