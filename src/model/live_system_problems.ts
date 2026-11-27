/**
 * live_system_problems.ts — what keeps a Live System from being reconciled,
 * found before it is submitted.
 *
 * The control plane stores a component whose offer it holds no contract for,
 * unchecked, and an agent skips a type it registers no handler for: the
 * component then sits in Instantiating forever with nothing said, and so does
 * everything that depends on it. A dependency or link to an id the Live System
 * does not have waits the same way. Each is refused here instead, with the
 * component named and the valid options listed.
 */
import type {LiveSystem, LiveSystemComponent} from './core';
import {offerTypeEntry} from './offer_type_registry';
import {
  deliveryModelOfOfferType,
  offerTypeProblem,
} from './offer_type_problems';

const sameProvider = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/** What is wrong with one component on its own: its type, model and provider. */
const componentProblems = (c: LiveSystemComponent): string[] => {
  const typeProblem = offerTypeProblem(c.type);
  if (typeProblem !== undefined) {
    return [`Component '${c.id}': ${typeProblem}`];
  }
  const problems: string[] = [];
  const named = deliveryModelOfOfferType(c.type);
  if (named !== c.deliveryModel) {
    problems.push(
      `Component '${c.id}' has deliveryModel '${c.deliveryModel}', but its ` +
        `offer type '${c.type}' is '${named}'. Set deliveryModel to '${named}'.`,
    );
  }
  const providers = [...(offerTypeEntry(c.type)?.providers ?? [])];
  if (
    c.provider !== undefined &&
    providers.length > 0 &&
    !providers.some(p => sameProvider(p, c.provider as string))
  ) {
    problems.push(
      `Component '${c.id}' has provider '${c.provider}', but offer type ` +
        `'${c.type}' is declared only for ${providers.sort().join(', ')}.`,
    );
  }
  return problems;
};

/**
 * Every reason `ls` cannot be reconciled as written, one line each naming the
 * component; empty when there is none. Checks each component's offer type
 * (known to an agent or defined with `defineOffer`, never a catalogue
 * component type), its delivery model and provider against that type, ids
 * that repeat, and dependencies or links to components the Live System does
 * not have.
 */
export const liveSystemProblems = (ls: LiveSystem): string[] => {
  const problems: string[] = [];
  const ids = ls.components.map(c => c.id);
  const present = new Set(ids);
  const repeated = new Set(ids.filter((id, i) => ids.indexOf(id) !== i));
  for (const id of repeated) {
    problems.push(
      `Component id '${id}' appears more than once; the control plane keeps ` +
        'one component per id, so all but one would be dropped.',
    );
  }
  const known = [...present].sort().join(', ');
  for (const c of ls.components) {
    problems.push(...componentProblems(c));
    for (const dependency of c.dependencies) {
      if (!present.has(dependency)) {
        problems.push(
          `Component '${c.id}' depends on '${dependency}', which is not a ` +
            `component of this Live System (components: ${known}).`,
        );
      }
    }
    for (const link of c.links) {
      if (!present.has(link.componentId)) {
        problems.push(
          `Component '${c.id}' links to '${link.componentId}', which is not a ` +
            `component of this Live System (components: ${known}).`,
        );
      }
    }
  }
  return problems;
};
