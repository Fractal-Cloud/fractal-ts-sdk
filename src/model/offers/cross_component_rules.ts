/**
 * offers/cross_component_rules.ts — the building blocks of the checks an offer
 * runs against the rest of its Live System (`Offer.validate`).
 *
 * Every rule here mirrors one an agent applies at reconcile time and fails the
 * component on: a dependency of a given type that must exist, a dependency that
 * may exist at most once, a link setting the target's agent requires. Checking
 * them before deploy turns a component that fails minutes into a deployment into
 * an error naming the component, the problem and the remedy.
 *
 * Only rules involving more than one component belong here; a component's own
 * parameters are checked by the control plane against the agent's contract.
 * Internal: not re-exported from the model barrel.
 */
import type {ComponentLink, LiveSystemComponent} from '../core';
import type {ComponentValidator} from './component_validator';

/** Throw the error every cross-component check throws, naming the component. */
export const refuseComponent = (
  self: {id: string; type: string},
  why: string,
): never => {
  throw new Error(`Live component '${self.id}' (${self.type}) ${why}.`);
};

/** Run every validator in order. */
export const allOf =
  (...validators: readonly ComponentValidator[]): ComponentValidator =>
  (self, all) => {
    for (const validator of validators) {
      validator(self, all);
    }
  };

/**
 * Run `validator` only on the emitted components of type `type`: an offer that
 * emits several components (an ECS service and its task definition, a DBMS and
 * its databases) has its `validate` called for each of them.
 */
export const onlyFor =
  (
    types: readonly string[],
    validator: ComponentValidator,
  ): ComponentValidator =>
  (self, all) => {
    if (types.includes(self.type)) {
      validator(self, all);
    }
  };

/** The components `self` depends on directly whose type is one of `types`. */
export const dependenciesOfType = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
  types: readonly string[],
): LiveSystemComponent[] =>
  self.dependencies.flatMap(id => {
    const target = all.find(c => c.id === id);
    return target !== undefined && types.includes(target.type) ? [target] : [];
  });

/**
 * Whether a component of one of `types` is reachable from `self` through its
 * dependencies, directly or transitively.
 */
export const reachableDependenciesOfType = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
  types: readonly string[],
): LiveSystemComponent[] => {
  const found: LiveSystemComponent[] = [];
  const seen = new Set<string>([self.id]);
  const pending = [...self.dependencies];
  while (pending.length > 0) {
    const id = pending.shift()!;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const target = all.find(c => c.id === id);
    if (target === undefined) {
      continue;
    }
    if (types.includes(target.type)) {
      found.push(target);
    }
    pending.push(...target.dependencies);
  }
  return found;
};

/** Every link in the Live System that points at `self`, with its source. */
export const inboundLinks = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
): {source: LiveSystemComponent; link: ComponentLink}[] =>
  all.flatMap(source =>
    source.links
      .filter(link => link.componentId === self.id)
      .map(link => ({source, link})),
  );

/** `self`'s outbound links whose target is one of `types`, with the target. */
export const outboundLinksTo = (
  self: LiveSystemComponent,
  all: readonly LiveSystemComponent[],
  types: readonly string[],
): {target: LiveSystemComponent; link: ComponentLink}[] =>
  self.links.flatMap(link => {
    const target = all.find(c => c.id === link.componentId);
    return target !== undefined && types.includes(target.type)
      ? [{target, link}]
      : [];
  });

/** A link setting as the agents read a scalar: trimmed text, '' when absent. */
export const settingText = (
  settings: Readonly<Record<string, unknown>>,
  key: string,
): string => {
  const value = settings[key];
  if (value === undefined || value === null || typeof value === 'object') {
    return '';
  }
  return String(value).trim();
};

/**
 * The agent refuses `self` unless it depends on a component of one of `types`
 * (the first type names it in the message); `remedy` says how to declare it.
 */
export const requireDependency =
  (spec: {
    types: readonly string[];
    why: string;
    remedy: string;
  }): ComponentValidator =>
  (self, all) => {
    if (dependenciesOfType(self, all, spec.types).length === 0) {
      refuseComponent(
        self,
        `has no ${spec.types[0]} dependency: ${spec.why}. ${spec.remedy}`,
      );
    }
  };

/** The agent refuses `self` when it depends on more than one component of `types`. */
export const atMostOneDependency =
  (spec: {types: readonly string[]; why: string}): ComponentValidator =>
  (self, all) => {
    const found = dependenciesOfType(self, all, spec.types);
    if (found.length > 1) {
      refuseComponent(
        self,
        `depends on ${found.length} ${spec.types[0]} components ` +
          `[${found.map(c => c.id).join(', ')}]: ${spec.why}. Keep one`,
      );
    }
  };
