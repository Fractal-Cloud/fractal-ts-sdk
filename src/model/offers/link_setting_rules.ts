/**
 * offers/link_setting_rules.ts — the link settings a link's target requires,
 * checked on the target against every link pointing at it.
 *
 * A link's settings are written by its source, but they are read, and refused,
 * by the agent of whatever the link points at: a database grants a role scoped
 * by `access`, a bucket grants a storage role, an identity provider creates an
 * app client of `clientType`. Each validator here runs on the target and reads
 * every inbound link, whichever offer emitted its source. Internal.
 */
import type {ComponentLink, LiveSystemComponent} from '../core';
import type {ComponentValidator} from './component_validator';
import {
  inboundLinks,
  refuseComponent,
  settingText,
} from './cross_component_rules';

/** Refuse the link from `source` to `target` for `why`. */
const refuseLink = (
  source: LiveSystemComponent,
  target: LiveSystemComponent,
  why: string,
): never => {
  throw new Error(
    `Link from '${source.id}' to '${target.id}' (${target.type}): ${why}.`,
  );
};

const DATABASE_ACCESS: Readonly<Record<string, readonly string[]>> = {
  access: ['read-only', 'read-write'],
  accessMode: ['read', 'write', 'readwrite'],
  roleName: ['reader', 'data_reader', 'writer', 'data_writer', 'admin'],
};

/**
 * Every link to a relational database declares the role it is granted: `access`
 * (`read-only` / `read-write`), or one of the older `accessMode` / `roleName`.
 * The database's agent refuses a link with none or with a value it does not
 * know — it never guesses, since read-only silently breaks a writer and
 * read-write silently over-grants a reader.
 */
export const databaseLinksDeclareAccess: ComponentValidator = (self, all) => {
  for (const {source, link} of inboundLinks(self, all)) {
    const declared = Object.keys(DATABASE_ACCESS).filter(
      key => settingText(link.settings, key) !== '',
    );
    if (declared.length === 0) {
      refuseLink(
        source,
        self,
        "declares no database access: set 'access' to read-only or read-write",
      );
    }
    for (const key of declared) {
      const value = settingText(link.settings, key);
      if (!DATABASE_ACCESS[key].includes(value.toLowerCase())) {
        refuseLink(
          source,
          self,
          `'${key}' is '${value}'; it must be one of ${DATABASE_ACCESS[key].join(', ')}` +
            (key === 'access'
              ? ''
              : " (or use 'access': read-only, read-write)"),
        );
      }
    }
  }
};

const STORAGE_ACCESS = ['read', 'write', 'read-write'];

/**
 * Every link to a bucket declares `access` (`read`, `write` or `read-write`),
 * the scope of the storage role its source is granted. The workload's agent
 * fails a link with any other value, and a link without one binds nothing.
 */
export const bucketLinksDeclareAccess: ComponentValidator = (self, all) => {
  for (const {source, link} of inboundLinks(self, all)) {
    const access = settingText(link.settings, 'access');
    if (access === '') {
      refuseLink(
        source,
        self,
        "declares no 'access': set it to read, write or read-write",
      );
    }
    if (!STORAGE_ACCESS.includes(access)) {
      refuseLink(
        source,
        self,
        `'access' is '${access}'; it must be read, write or read-write`,
      );
    }
  }
};

const MESSAGING_ACCESS = ['publish', 'subscribe', 'publish-subscribe'];

/**
 * Whether `source` is a workload, a function or a data-processing job: the
 * components whose links to a topic or queue are grants (the messaging link
 * contract). A queue exporter's link, say, only names what it watches.
 */
const isMessagingConsumer = (source: LiveSystemComponent): boolean =>
  source.type.startsWith('CustomWorkloads.') ||
  source.type === 'NetworkAndCompute.CaaS.ECSService' ||
  source.type === 'NetworkAndCompute.CaaS.CloudRunService' ||
  /^BigData\.[A-Za-z]+\.[A-Za-z]*Job$/.test(source.type);

/** The `access` of a link to a topic or queue, refused when not one of the three. */
const messagingAccess = (
  source: LiveSystemComponent,
  target: LiveSystemComponent,
  link: ComponentLink,
): string => {
  const access = settingText(link.settings, 'access');
  if (access === '') {
    refuseLink(
      source,
      target,
      "declares no 'access': set it to publish, subscribe or publish-subscribe",
    );
  }
  if (!MESSAGING_ACCESS.includes(access.toLowerCase())) {
    refuseLink(
      source,
      target,
      `'access' is '${access}'; it must be publish, subscribe or publish-subscribe`,
    );
  }
  return access.toLowerCase();
};

/**
 * Every link from a workload, function or job to a queue declares `access`; the workload's agent grants the
 * matching rights and fails a link with any other value.
 */
export const queueLinksDeclareAccess: ComponentValidator = (self, all) => {
  for (const {source, link} of inboundLinks(self, all)) {
    if (!isMessagingConsumer(source)) {
      continue;
    }
    messagingAccess(source, self, link);
  }
};

/**
 * Every link from a workload, function or job to an SNS topic declares
 * `access`, and never `subscribe`: a topic
 * is consumed through a queue subscribed to it, so the agent grants nothing for
 * a subscribing link.
 */
export const topicLinksDeclarePublish: ComponentValidator = (self, all) => {
  for (const {source, link} of inboundLinks(self, all)) {
    if (!isMessagingConsumer(source)) {
      continue;
    }
    if (messagingAccess(source, self, link) !== 'publish') {
      refuseLink(
        source,
        self,
        'subscribes to an SNS topic, which grants nothing: a topic is consumed ' +
          "through a queue subscribed to it. Link the queue instead, or set access to 'publish'",
      );
    }
  }
};

const CLIENT_TYPES = ['web', 'spa', 'machine'];

/** Whether a link setting holds a non-empty list (or a non-blank single value). */
const hasValues = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(v => String(v).trim() !== '')
    : typeof value === 'string' && value.trim() !== '';

/**
 * Each link to an identity provider provisions one app client of `clientType`
 * (`web`, the default, `spa` or `machine`). The agent refuses any other type,
 * and a browser client (`web` / `spa`) needs the `redirectUris` its login flow
 * returns to.
 */
export const identityProviderLinksDeclareClient: ComponentValidator = (
  self,
  all,
) => {
  for (const {source, link} of inboundLinks(self, all)) {
    const clientType = settingText(link.settings, 'clientType') || 'web';
    if (!CLIENT_TYPES.includes(clientType.toLowerCase())) {
      refuseLink(
        source,
        self,
        `'clientType' is '${clientType}'; it must be web, spa or machine`,
      );
    }
    if (
      clientType.toLowerCase() !== 'machine' &&
      !hasValues(link.settings.redirectUris)
    ) {
      refuseLink(
        source,
        self,
        `a ${clientType.toLowerCase()} client logs users in and needs the 'redirectUris' ` +
          "the login returns to; set them, or use clientType 'machine' for a client without a browser flow",
      );
    }
  }
};

/**
 * A component linking TO a load balancer declares one of its listeners:
 * `listenerPort`, `listenerProtocol` and `targetComponentId`, the backend (one
 * of the load balancer's own link targets) it forwards to. The agent skips a
 * listener missing any of them, so the load balancer never answers on it.
 */
export const loadBalancerListenerLinks: ComponentValidator = (self, all) => {
  for (const {source, link} of inboundLinks(self, all)) {
    const missing = ['listenerPort', 'listenerProtocol', 'targetComponentId']
      .filter(key => settingText(link.settings, key) === '')
      .map(key => `'${key}'`);
    if (missing.length > 0) {
      refuseLink(
        source,
        self,
        `declares a listener of this load balancer without ${missing.join(', ')}: ` +
          'set listenerPort, listenerProtocol and targetComponentId (one of the link targets of the load balancer)',
      );
    }
    const port = Number(settingText(link.settings, 'listenerPort'));
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      refuseLink(
        source,
        self,
        `'listenerPort' is '${settingText(link.settings, 'listenerPort')}'; it must be a port from 1 to 65535`,
      );
    }
    const target = settingText(link.settings, 'targetComponentId');
    if (!self.links.some(l => l.componentId === target)) {
      refuseLink(
        source,
        self,
        `the listener forwards to '${target}', which this load balancer does not link to: ` +
          `link the load balancer to '${target}' so it gets a target group, or name one of ` +
          `[${self.links.map(l => l.componentId).join(', ')}]`,
      );
    }
  }
};

/**
 * A traffic link between two compute components (VMs, ECS services) becomes a
 * rule on their managed security groups, which needs `fromPort`: the agent
 * skips a link without it, and the two components cannot reach each other.
 */
export const computeLinksDeclarePorts =
  (computeTypes: readonly string[]): ComponentValidator =>
  (self, all) => {
    for (const {source, link} of inboundLinks(self, all)) {
      if (!computeTypes.includes(source.type)) {
        continue;
      }
      if (
        settingText(link.settings, 'fromPort') === '' &&
        settingText(link.settings, 'tgPort') === ''
      ) {
        refuseLink(
          source,
          self,
          "is a traffic rule between two compute components but declares no 'fromPort': " +
            'set fromPort (and optionally toPort and protocol) so the managed security groups admit it',
        );
      }
    }
  };

/**
 * A firewall-like component with no members cannot be applied: the agent
 * refuses it unless something links to it (membership is the link from the
 * member to the group) or, where it exists, `memberParameter` selects members.
 */
export const requireMembers =
  (memberParameter: string): ComponentValidator =>
  (self, all) => {
    if (
      inboundLinks(self, all).length > 0 ||
      hasValues(self.parameters[memberParameter])
    ) {
      return;
    }
    const outbound = self.links.map(l => l.componentId);
    refuseComponent(
      self,
      `has no members: nothing links to it and '${memberParameter}' is not set, so the ` +
        'agent cannot tell what it applies to. Link each member to it ' +
        '(bp.link(member, group))' +
        (outbound.length > 0
          ? `; its own links to [${outbound.join(', ')}] point the wrong way`
          : ''),
    );
  };
