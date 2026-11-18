import type {LiveSystemComponent} from './core';

/**
 * How an offer receives the links other components make to its component: the
 * settings of each incoming link as the blueprint wrote them, in, and the
 * settings the offer's agent reads, out. Throw to refuse the link; the message
 * reaches the caller unchanged.
 *
 * A link's settings are written in the vendor-neutral blueprint, in the link
 * vocabulary of the aria-spec component type (`accessMode`, `indexPattern`,
 * ...), by a consumer that cannot know which agent serves its target. Only the
 * target's offer knows what its agent reads, so it translates for an agent
 * that deviates from that vocabulary, and refuses settings its agent would
 * silently grant nothing for.
 *
 * `toLiveSystem` applies it once every component is emitted and before any
 * offer's `validate` runs, so `validate` sees the settings the agent reads.
 */
export type IncomingLinkRule = (
  settings: Readonly<Record<string, unknown>>,
  from: LiveSystemComponent,
  target: LiveSystemComponent,
) => Record<string, unknown>;
