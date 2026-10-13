/**
 * live_system_cycles.ts — refuse a Live System whose components wait on each
 * other in a circle.
 *
 * The agents reconcile a Live System in an order derived from what each
 * component depends on AND links to: a dependency must be Active first, and a
 * link's target is ordered before its source. A cycle in that graph has no
 * order, and the agents refuse the whole Live System ("Circular dependency
 * detected"), so none of it is reconciled. Two components linking to each other
 * are such a cycle. Internal.
 */
import type {LiveSystemComponent} from './core';

/** Throws, naming the components, when dependencies and links form a cycle. */
export const refuseCycles = (
  components: readonly LiveSystemComponent[],
): void => {
  const byId = new Map(components.map(c => [c.id, c]));
  const edges = (c: LiveSystemComponent): string[] =>
    [...c.dependencies, ...c.links.map(l => l.componentId)].filter(id =>
      byId.has(id),
    );
  const done = new Set<string>();
  const path: string[] = [];
  const onPath = new Set<string>();
  const visit = (id: string): void => {
    if (done.has(id)) {
      return;
    }
    if (onPath.has(id)) {
      const cycle = [...path.slice(path.indexOf(id)), id];
      throw new Error(
        `Live components ${cycle.map(c => `'${c}'`).join(' -> ')} form a cycle of ` +
          'dependencies and links: the agents order a Live System by what each component ' +
          'depends on and links to, and refuse one that has no order. Remove a dependency ' +
          'or a link from the cycle.',
      );
    }
    onPath.add(id);
    path.push(id);
    for (const next of edges(byId.get(id)!)) {
      visit(next);
    }
    path.pop();
    onPath.delete(id);
    done.add(id);
  };
  for (const c of components) {
    visit(c.id);
  }
};
