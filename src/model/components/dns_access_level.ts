/**
 * components/dns_access_level.ts — how much of a DNS zone a component may touch.
 */

/**
 * `none` < `read` < `write`; `write` includes `read`. Any access reads the
 * whole zone (Route 53 and Cloud DNS cannot list record sets per type), so
 * `read` means something only for every type at once (`'*': 'read'`).
 */
export type DnsAccessLevel = 'none' | 'read' | 'write';
