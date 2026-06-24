import {AbstractComponent} from './component/abstract_component';
import {BlueprintComponent} from './component';
import {LiveSystem} from '../live_system';
import {LiveSystemComponent} from '../live_system/component';
import {getLiveSystemBuilder} from '../live_system/entity';
import {getLiveSystemIdBuilder} from '../live_system/id';
import {getFractalIdBuilder, FractalId} from './id';
import {getVersionBuilder} from '../values/version';
import {KebabCaseString} from '../values/kebab_case_string';
import {BoundedContext} from '../bounded_context';
import {Environment} from '../environment';

/**
 * Fractal + Interface, expressed functionally (the book's model).
 *
 * An infra team authors a Fractal with `createFractal`: a blueprint of abstract
 * components (each carrying its candidate Offers) and a typed Interface of
 * declarative operations. A dev team specializes ONLY through the Interface and
 * never names an Offer — the Provider chosen at `toLiveSystem` time selects the
 * concrete Offer per component and produces a real, validated LiveSystem.
 */

/** Context passed to the blueprint authoring function. */
type BlueprintContext = {
  /** Register an abstract component in the blueprint; returns its handle. */
  add: <C extends AbstractComponent>(component: C) => C;
};

/** A loose record of interface operations as authored by the infra team. */
type OperationsShape = Record<string, (...args: never[]) => unknown>;

/**
 * The dev-facing Interface: each authored operation is wrapped to return the
 * Interface itself, so specialization reads as a fluent chain.
 */
export type ChainableOperations<Ops extends OperationsShape> = {
  [K in keyof Ops]: (...args: Parameters<Ops[K]>) => ChainableOperations<Ops>;
};

/** The authored Blueprint: the abstract components serialized with their Services. */
export type Blueprint = {
  fractalId: FractalId;
  components: BlueprintComponent[];
};

export type Fractal<Ops extends OperationsShape> = {
  /** The dev-facing, offer-independent specialization Interface. */
  operations: ChainableOperations<Ops>;
  /** The authored blueprint (abstract components + candidate offers per Service). */
  blueprint: Blueprint;
  /** Select offers by Provider and produce a real, validated LiveSystem. */
  toLiveSystem: (config: {
    name: string;
    environment: Environment;
    provider: LiveSystemComponent.Provider;
    boundedContextId?: BoundedContext.Id;
  }) => LiveSystem;
};

export type FractalDefinition<
  Slots extends Record<string, AbstractComponent>,
  Ops extends OperationsShape,
> = {
  id: string;
  version: {major: number; minor: number; patch: number};
  description?: string;
  boundedContextId: BoundedContext.Id;
  blueprint: (bp: BlueprintContext) => Slots;
  operations: (slots: Slots) => Ops;
};

export function createFractal<
  Slots extends Record<string, AbstractComponent>,
  Ops extends OperationsShape,
>(def: FractalDefinition<Slots, Ops>): Fractal<Ops> {
  const components: AbstractComponent[] = [];

  const bp: BlueprintContext = {
    add: component => {
      components.push(component);
      return component;
    },
  };

  const slots = def.blueprint(bp);
  const rawOperations = def.operations(slots);

  // Wrap each authored operation so it returns the Interface for chaining.
  const operations = {} as ChainableOperations<Ops>;
  for (const key of Object.keys(rawOperations) as (keyof Ops)[]) {
    operations[key] = ((...args: never[]) => {
      rawOperations[key](...args);
      return operations;
    }) as ChainableOperations<Ops>[keyof Ops];
  }

  const fractalId = getFractalIdBuilder()
    .withBoundedContextId(def.boundedContextId)
    .withName(KebabCaseString.getBuilder().withValue(def.id).build())
    .withVersion(
      getVersionBuilder()
        .withMajor(def.version.major)
        .withMinor(def.version.minor)
        .withPatch(def.version.patch)
        .build(),
    )
    .build();

  const blueprint: Blueprint = {
    fractalId,
    components: components.map(component => component.toBlueprintComponent()),
  };

  return {
    operations,
    blueprint,
    toLiveSystem: ({name, environment, provider, boundedContextId}) => {
      const liveSystemId = getLiveSystemIdBuilder()
        .withBoundedContextId(boundedContextId ?? def.boundedContextId)
        .withName(KebabCaseString.getBuilder().withValue(name).build())
        .build();

      const liveComponents = components.flatMap(component =>
        component.instantiate(provider),
      );

      return getLiveSystemBuilder()
        .withId(liveSystemId)
        .withFractalId(fractalId)
        .withComponents(liveComponents)
        .withEnvironment(environment)
        .withGenericProvider(provider)
        .build();
    },
  };
}
