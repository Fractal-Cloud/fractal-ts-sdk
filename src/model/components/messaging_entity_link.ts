/**
 * Settings shape for a link from a `Workload` or a `DataProcessingJob` to a
 * `Messaging.MessagingEntity`: "I publish to / subscribe from this topic or
 * queue". The messaging agent grants the source the matching rights on the
 * entity (on AWS: `sns:Publish` on a topic, receive/delete on a queue, through
 * the workload's own role) and injects where to find it (`TOPIC_ARN_<TARGET>`,
 * `QUEUE_URL_<TARGET>`). Use with the generic `bp.link` / operation `link`:
 *
 *   link(service, events, {access: 'publish'} satisfies MessagingEntityLink);
 *
 * The target may be a reference to another Live System's entity: the grant is
 * made by the source's side, so it works across Live Systems.
 */
export type MessagingEntityLink = {
  access: 'publish' | 'subscribe' | 'publish-subscribe';
  /** Consumer group / subscription; only meaningful with `subscribe`. */
  consumerGroup?: string;
  /** Subscriber starting position: `start`, `end`, or an ISO timestamp. */
  startingPosition?: string;
  /** Prefix of the injected environment variables; defaults to the target id. */
  envPrefix?: string;
};
