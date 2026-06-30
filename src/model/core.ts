/**
 * core.ts — the LOCKED Fractal model engine (see docs/fractal-model.md).
 *
 * Shared by every Component factory (src/model/components/*) and Offer catalogue
 * (src/model/offers/*). This is the canonical engine; the catalogue and the
 * model specs (src/model/*.test.ts) build on it.
 *
 * Decisions encoded here:
 *   - Fractal is vendor-agnostic: blueprints reference abstract Components only;
 *     offers come from the open Catalogue at LiveSystem time.
 *   - Offers carry their own vendor config and declare which Component they satisfy.
 *   - Agnostic params are typed `.withXxx()` setters on Component factories;
 *     called at design time they are GUARDRAILS (locked; devs cannot override).
 *   - Specialization is pure transforms with an immutable fluent `.specialize()`.
 *   - A LiveSystem is built EXCLUSIVELY by per-component offer selection
 *     (`select`), with no global provider; mixed vendors are normal.
 */

// ── Catalogue value types ────────────────────────────────────────────────────
// Vendors only. `CaaS`/`SaaS` are NOT vendors — they are delivery models below.
// `provider` is optional on an Offer: cloud/platform offers name their vendor;
// vendor-neutral self-hosted offers (e.g. generic Kafka/Prometheus on any
// cluster) omit it and are identified by `deliveryModel` + `offerType`.
export type Provider =
  | 'AWS'
  | 'Azure'
  | 'GCP'
  | 'OCI'
  | 'Hetzner'
  | 'Aruba'
  | 'RedHat'
  | 'VMware';
export type DeliveryModel = 'IaaS' | 'PaaS' | 'CaaS' | 'SaaS' | 'FaaS';

// ── Offers (Catalogue, Level 3) ──────────────────────────────────────────────
/**
 * A runtime relationship to another component, on the agent wire contract:
 * `{componentId, settings}`. The agent resolves the target by `componentId` and
 * reads `settings` (e.g. fromPort/protocol for traffic rules; empty for security
 * group / network-policy membership).
 */
export type ComponentLink = {
  componentId: string;
  settings: Record<string, unknown>;
};
/** A child component added under a parent via an application operation (e.g. a
 *  database under a DBMS). The parent offer's `instantiate` emits a live
 *  component for each child IN ITS OWN VENDOR FAMILY — children are not
 *  independently offer-selected; swapping the parent offer swaps the family. */
export type ChildContext = {
  id: string;
  parameters: Record<string, unknown>;
  dependencies: readonly string[];
  links: readonly ComponentLink[];
};
export type InstantiationContext = {
  id: string;
  parameters: Record<string, unknown>;
  dependencies: readonly string[];
  links: readonly ComponentLink[];
  /** Child components the application added under this component. */
  children: readonly ChildContext[];
};
export type LiveSystemComponent = {
  id: string;
  type: string; // 3-part offer type
  provider?: Provider; // absent for vendor-neutral self-hosted offers
  deliveryModel: DeliveryModel;
  parameters: Record<string, unknown>;
  dependencies: readonly string[];
  links: readonly ComponentLink[];
};
export type Offer<C extends string = string, Cfg = unknown> = {
  readonly satisfies: C; // the Component (Level 1) it satisfies
  readonly offerType: string;
  readonly provider?: Provider; // absent for vendor-neutral self-hosted offers
  readonly deliveryModel: DeliveryModel;
  readonly config: Cfg; // VENDOR KNOBS live here, and only here
  readonly instantiate: (ctx: InstantiationContext) => LiveSystemComponent[];
};

/** Build an offer constructor (pure). Default instantiate merges neutral params + vendor config. */
export const defineOffer =
  <C extends string, Cfg>(spec: {
    satisfies: C;
    offerType: string;
    provider?: Provider;
    deliveryModel: DeliveryModel;
    instantiate?: (
      ctx: InstantiationContext,
      config: Cfg,
    ) => LiveSystemComponent[];
  }) =>
  (config: Cfg): Offer<C, Cfg> => ({
    satisfies: spec.satisfies,
    offerType: spec.offerType,
    provider: spec.provider,
    deliveryModel: spec.deliveryModel,
    config,
    instantiate: ctx =>
      spec.instantiate
        ? spec.instantiate(ctx, config)
        : [
            {
              id: ctx.id,
              type: spec.offerType,
              provider: spec.provider,
              deliveryModel: spec.deliveryModel,
              parameters: {
                ...ctx.parameters,
                ...(config as Record<string, unknown>),
              },
              dependencies: ctx.dependencies,
              links: ctx.links,
            },
          ],
  });

// ── Component node (immutable) ───────────────────────────────────────────────
export type NodeState = {
  readonly id: string;
  readonly component: string; // Level-1 Component tag, e.g. 'Storage.ObjectStorage'
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly locked: ReadonlySet<string>;
  readonly dependencies: readonly string[];
};
/**
 * A blueprint component node. `Id` and `Component` literals are phantom types
 * (never present at runtime) so `toLiveSystem({select})` is type-checked: each
 * component id maps to the Component it requires, and the selected offer must
 * satisfy that Component.
 */
export type ComponentNode<
  Id extends string = string,
  Component extends string = string,
> = {
  readonly state: NodeState;
  readonly __id?: Id;
  readonly __component?: Component;
};
export type AnyNode = ComponentNode;

/** Authoring primitive: create a fresh node for a Component factory. */
export const newNode = (id: string, component: string): NodeState => ({
  id,
  component,
  parameters: {},
  locked: new Set(),
  dependencies: [],
});
/** Authoring primitive: set a neutral param AND lock it (guardrail, design time). */
export const guardrail = (
  s: NodeState,
  key: string,
  value: unknown,
): NodeState => ({
  ...s,
  parameters: {...s.parameters, [key]: value},
  locked: new Set([...s.locked, key]),
});
/** Authoring primitive: declare a structural dependency on another node. */
export const addDependency = (s: NodeState, depId: string): NodeState => ({
  ...s,
  dependencies: [...s.dependencies, depId],
});

// ── Fractal state + transforms ───────────────────────────────────────────────
/** A link authored in the blueprint: source component → target component + settings. */
type LinkRecord = {
  sourceId: string;
  targetId: string;
  settings: Record<string, unknown>;
};
type FractalState = {
  readonly fractalId: string;
  readonly fractalName: string;
  readonly version: Version;
  readonly boundedContext: OwnerRef;
  readonly nodes: Readonly<Record<string, NodeState>>;
  readonly order: readonly string[];
  readonly links: readonly LinkRecord[];
  /** Child component nodes added via operations, keyed by parent component id. */
  readonly children: Readonly<Record<string, readonly NodeState[]>>;
};
/** Collect the links a component is the source of, in wire shape. */
const linksFor = (st: FractalState, sourceId: string): ComponentLink[] =>
  st.links
    .filter(l => l.sourceId === sourceId)
    .map(l => ({componentId: l.targetId, settings: l.settings}));
type Transform = (st: FractalState) => FractalState;

const ensureUnlocked = (node: NodeState, key: string) => {
  if (node.locked.has(key)) {
    throw new Error(
      `Parameter '${key}' on '${node.id}' is a locked guardrail and cannot be changed.`,
    );
  }
};
const setOpen = (
  st: FractalState,
  id: string,
  key: string,
  value: unknown,
): FractalState => {
  const node = st.nodes[id];
  ensureUnlocked(node, key);
  return {
    ...st,
    nodes: {
      ...st.nodes,
      [id]: {...node, parameters: {...node.parameters, [key]: value}},
    },
  };
};
const appendOpen = (
  st: FractalState,
  id: string,
  key: string,
  value: unknown,
): FractalState => {
  const node = st.nodes[id];
  ensureUnlocked(node, key);
  const prev = (node.parameters[key] as unknown[] | undefined) ?? [];
  return {
    ...st,
    nodes: {
      ...st.nodes,
      [id]: {
        ...node,
        parameters: {...node.parameters, [key]: [...prev, value]},
      },
    },
  };
};

/** Dev-facing handle exposed to the `operations` author; produces pure transforms. */
export type SlotOps = {
  set: (key: string, value: unknown) => Transform;
  append: (key: string, value: unknown) => Transform;
  /**
   * Add a child component under this component (e.g. a database under a DBMS).
   * The child is emitted by the PARENT's selected offer, in the parent's vendor
   * family — no separate offer selection. Swapping the parent offer swaps the
   * child's family too. The child depends on this parent.
   */
  addChild: (child: AnyNode) => Transform;
};
const addChild = (
  st: FractalState,
  parentId: string,
  child: NodeState,
): FractalState => ({
  ...st,
  children: {
    ...st.children,
    [parentId]: [...(st.children[parentId] ?? []), child],
  },
});
const slotOps = (id: string): SlotOps => ({
  set: (k, v) => st => setOpen(st, id, k, v),
  append: (k, v) => st => appendOpen(st, id, k, v),
  addChild: child => st => addChild(st, id, child.state),
});
/** Collect a parent's child components in instantiation-context shape. */
const childrenFor = (st: FractalState, parentId: string): ChildContext[] =>
  (st.children[parentId] ?? []).map(c => ({
    id: c.id,
    parameters: {...c.parameters},
    dependencies: [...c.dependencies, parentId],
    links: linksFor(st, c.id),
  }));

// ── Serialization + LiveSystem ───────────────────────────────────────────────
export type SerializedComponent = {
  id: string;
  component: string;
  parameters: Record<string, unknown>;
  locked: string[];
  dependencies: string[];
  links: ComponentLink[];
};
export type Blueprint = {fractalId: string; components: SerializedComponent[]};
/** Owner-scoped reference (Bounded Context / Environment). Fields optional so
 *  non-deploying tests can omit owner identity; deploy validates them. */
export type OwnerRef = {ownerType?: string; ownerId?: string; name?: string};
export type Version = {major: number; minor: number; patch: number};
export type LiveSystem = {
  name: string;
  fractalId: string;
  fractalName: string;
  version: Version;
  boundedContext: OwnerRef;
  environment: OwnerRef;
  components: LiveSystemComponent[];
};
export type ToLiveSystemArgs = {
  name: string;
  environment: OwnerRef;
  /** Per-component offer selection. Key = component id. */
  select: Record<string, Offer>;
};

const serialize = (st: FractalState): Blueprint => ({
  fractalId: st.fractalId,
  components: st.order.map(id => {
    const n = st.nodes[id];
    return {
      id,
      component: n.component,
      parameters: {...n.parameters},
      locked: [...n.locked],
      dependencies: [...n.dependencies],
      links: linksFor(st, id),
    };
  }),
});

const toLiveSystem = (st: FractalState, args: ToLiveSystemArgs): LiveSystem => {
  // Reject unknown selection keys (e.g. a typo'd component id) — selection must
  // map exactly to the blueprint's top-level components. Child components are
  // emitted by their parent's offer and are NOT selected here.
  const validIds = new Set(st.order);
  for (const key of Object.keys(args.select)) {
    if (!validIds.has(key)) {
      throw new Error(
        `Selection key '${key}' does not match any component in the fractal. ` +
          `Valid components: ${st.order.join(', ')}.`,
      );
    }
  }

  const components: LiveSystemComponent[] = [];
  for (const id of st.order) {
    const node = st.nodes[id];
    const offer = args.select[id];
    if (!offer) {
      throw new Error(`Missing offer selection for component '${id}'.`);
    }
    if (offer.satisfies !== node.component) {
      throw new Error(
        `Offer '${offer.offerType}' does not satisfy component '${node.component}' (selected for '${id}').`,
      );
    }
    // The selected offer emits the component plus a live component for each
    // app-added child (in the offer's own vendor family).
    const children = childrenFor(st, id);
    const emitted = offer.instantiate({
      id,
      parameters: {...node.parameters},
      dependencies: node.dependencies,
      links: linksFor(st, id),
      children,
    });
    // Guard against silent child-drop: if the application added children under
    // this component, the selected offer MUST emit a live component for each.
    if (children.length > 0) {
      const emittedIds = new Set(emitted.map(c => c.id));
      const dropped = children.filter(c => !emittedIds.has(c.id));
      if (dropped.length > 0) {
        throw new Error(
          `Offer '${offer.offerType}' selected for '${id}' does not emit its child ` +
            `component(s) [${dropped.map(c => c.id).join(', ')}]. The selected offer ` +
            'must support child components (e.g. databases added via an operation).',
        );
      }
    }
    components.push(...emitted);
  }
  return {
    name: args.name,
    fractalId: st.fractalId,
    fractalName: st.fractalName,
    version: st.version,
    boundedContext: st.boundedContext,
    environment: args.environment,
    components,
  };
};

// ── Type-safe per-component offer selection ──────────────────────────────────
type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
/** From the blueprint slots, derive `{ [componentId]: ComponentTag }`. */
type IdToComponent<Slots> = UnionToIntersection<
  {
    [K in keyof Slots]: Slots[K] extends ComponentNode<
      infer Id,
      infer Component
    >
      ? {[P in Id]: Component}
      : never;
  }[keyof Slots]
>;
/** Each component id requires an offer that satisfies that id's Component. */
export type Selection<Slots> = {
  [Id in keyof IdToComponent<Slots>]: Offer<IdToComponent<Slots>[Id] & string>;
};
export type TypedToLiveSystemArgs<Slots> = {
  name: string;
  environment: OwnerRef;
  select: Selection<Slots>;
};

// ── Fluent specialization (immutable sugar over pure transforms) ─────────────
type OpFactories = Record<string, (...args: never[]) => Transform>;
type Specialized<Slots, Ops extends OpFactories> = {
  [K in keyof Ops]: (...args: Parameters<Ops[K]>) => Specialized<Slots, Ops>;
} & {
  readonly value: FractalState;
  readonly blueprint: Blueprint;
  toLiveSystem: (args: TypedToLiveSystemArgs<Slots>) => LiveSystem;
};

const fluent = <Slots, Ops extends OpFactories>(
  ops: Ops,
  st: FractalState,
): Specialized<Slots, Ops> => {
  const api = {
    value: st,
    blueprint: serialize(st),
    toLiveSystem: (args: TypedToLiveSystemArgs<Slots>) =>
      toLiveSystem(st, args as unknown as ToLiveSystemArgs),
  } as Record<string, unknown>;
  for (const k of Object.keys(ops)) {
    api[k] = (...args: never[]) => fluent<Slots, Ops>(ops, ops[k](...args)(st));
  }
  return api as Specialized<Slots, Ops>;
};

// ── createFractal ────────────────────────────────────────────────────────────
export type Fractal<Slots, Ops extends OpFactories> = {
  readonly fractalId: string;
  readonly blueprint: Blueprint;
  readonly ops: Ops;
  specialize: () => Specialized<Slots, Ops>;
  toLiveSystem: (args: TypedToLiveSystemArgs<Slots>) => LiveSystem;
};

export function createFractal<
  Slots extends Record<string, AnyNode>,
  Ops extends OpFactories,
>(def: {
  id: string;
  version: Version;
  boundedContextId: OwnerRef;
  description?: string;
  blueprint: (bp: {
    add: <N extends AnyNode>(n: N) => N;
    /**
     * Declare a runtime link: `source` links to `target` with optional settings
     * (e.g. {fromPort, protocol} for a traffic rule; empty for security-group /
     * network-policy membership). Blueprint owns all links — see docs/fractal-model.md.
     */
    link: (
      source: AnyNode,
      target: AnyNode,
      settings?: Record<string, unknown>,
    ) => void;
  }) => Slots;
  operations?: (slots: {[K in keyof Slots]: SlotOps}) => Ops;
}): Fractal<Slots, Ops> {
  const order: string[] = [];
  const linkRecords: LinkRecord[] = [];
  const bp = {
    add: <N extends AnyNode>(n: N): N => {
      order.push(n.state.id);
      return n;
    },
    link: (
      source: AnyNode,
      target: AnyNode,
      settings: Record<string, unknown> = {},
    ): void => {
      linkRecords.push({
        sourceId: source.state.id,
        targetId: target.state.id,
        settings,
      });
    },
  };
  const slots = def.blueprint(bp);

  const nodes: Record<string, NodeState> = {};
  const slotToId: Record<string, string> = {};
  for (const key of Object.keys(slots)) {
    const node = (slots as Record<string, AnyNode>)[key];
    nodes[node.state.id] = node.state;
    slotToId[key] = node.state.id;
  }

  const fractalId = `${def.id}:${def.version.major}.${def.version.minor}.${def.version.patch}`;
  const state: FractalState = {
    fractalId,
    fractalName: def.id,
    version: def.version,
    boundedContext: def.boundedContextId,
    nodes,
    order,
    links: linkRecords,
    children: {},
  };

  const slotOpsMap: Record<string, SlotOps> = {};
  for (const key of Object.keys(slotToId)) {
    slotOpsMap[key] = slotOps(slotToId[key]);
  }
  const ops = (
    def.operations
      ? def.operations(slotOpsMap as {[K in keyof Slots]: SlotOps})
      : {}
  ) as Ops;

  return {
    fractalId,
    blueprint: serialize(state),
    ops,
    specialize: () => fluent<Slots, Ops>(ops, state),
    toLiveSystem: (args: TypedToLiveSystemArgs<Slots>) =>
      toLiveSystem(state, args as unknown as ToLiveSystemArgs),
  };
}
