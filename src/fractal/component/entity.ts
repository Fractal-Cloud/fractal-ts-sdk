import {BlueprintComponent} from "./index";
import {DEFAULT_COMPONENT, isValidComponent} from "../../component/entity";
import {BlueprintComponentType, DEFAULT_BLUEPRINT_COMPONENT_TYPE} from "./type";
import {Component} from "../../component";
import {Version} from "../../values/version";
import {GenericParameters} from "../../values/generic_parameters";
import {BlueprintComponentDependency} from "./dependency";
import {ComponentId} from "../../component/id";
import {ComponentLink} from "../../component/link";

export const DEFAULT_BLUEPRINT_COMPONENT: BlueprintComponent = {
  ...DEFAULT_COMPONENT,
  type: DEFAULT_BLUEPRINT_COMPONENT_TYPE,
  dependencies: [],
  isLocked: false,
  recreateOnFailure: false,
} as const;

export const isValidBlueprintComponent = (component: BlueprintComponent): string[] => {
  var simplifiedComponent = {
      ...component,
      dependencies: [] as Component.Dependency[]
  };
  return isValidComponent(simplifiedComponent);
}

/**
 */
export type BlueprintComponentBuilder = {
  /**
   * Sets the type for the component being built.
   *
   * @param {BlueprintComponentType} type - The type to associate with the component.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withType: (type: BlueprintComponentType) => BlueprintComponentBuilder;

  /**
   * Sets the identifier for the component being built.
   *
   * @param {Component.Id} id - The unique identifier to associate with the component.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withId: (id: Component.Id) => BlueprintComponentBuilder;

  /**
   * Sets the version for the component being built.
   *
   * @param {Version} version - The version to associate with the component.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withVersion: (version: Version) => BlueprintComponentBuilder;

  /**
   * Sets the display name for the component being built.
   *
   * @param {string} displayName - The display name to associate with the component.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withDisplayName: (displayName: string) => BlueprintComponentBuilder;

  /**
   * Sets the description for the component being built.
   *
   * @param {string} description - The description to associate with the component.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withDescription: (description: string) => BlueprintComponentBuilder;

  /**
   * Sets the parameters for the component being built.
   *
   * @param {GenericParameters} parameters - The parameters to associate with the component.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withParameters: (parameters: GenericParameters) => BlueprintComponentBuilder;

  /**
   * Sets the links for the component being built.
   *
   * @param {Component.Link[]} links - The links to associate with the component.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withLinks: (links: Component.Link[]) => BlueprintComponentBuilder;

  /**
   * Adds a list of dependencies to the BlueprintComponentBuilder.
   *
   * This function allows specifying dependencies that the component requires
   * to function correctly. Each dependency is passed as a
   * BlueprintComponentDependency object, which provides the necessary
   * details of the dependency.
   *
   * @param {BlueprintComponentDependency[]} dependencies - An array of objects
   * representing the component's dependencies.
   * @returns {BlueprintComponentBuilder} The updated instance of the
   * BlueprintComponentBuilder with the specified dependencies included.
   */
  withDependencies: (dependencies: BlueprintComponentDependency[]) => BlueprintComponentBuilder;

  /**
   * Adds or updates the `isLocked` attribute for the blueprint component.
   *
   * @param {boolean} value - Determines whether the component should be marked as locked.
   *                          Pass `true` to lock the component or `false` to unlock it.
   * @returns {BlueprintComponentBuilder} The instance of the blueprint component builder for method chaining.
   */
  withIsLocked: (value: boolean) => BlueprintComponentBuilder;

  /**
   * Configures the builder to recreate the component upon encountering a failure.
   *
   * @param {boolean} value - A boolean flag indicating whether the component should be recreated on failure.
   *                          If true, the builder will regenerate the component when a failure occurs.
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  withRecreateOnFailure: (value: boolean) => BlueprintComponentBuilder;

  /**
   * Resets the builder's internal state to default values.
   *
   * This method clears all previously configured properties and returns
   * the builder to its initial state, allowing it to be reused for
   * constructing a new Component instance.
   *
   * @returns {BlueprintComponentBuilder} The builder instance for method chaining.
   */
  reset: () => BlueprintComponentBuilder;

  /**
   * Validates and constructs the final Component object.
   *
   * This method performs validation on the configured properties to ensure
   * the Component is valid (id, type, version, and display name must be valid).
   * If validation fails, a SyntaxError is thrown.
   *
   * @returns {BlueprintComponent} An immutable Component instance with the configured properties.
   * @throws {SyntaxError} If the component configuration is invalid.
   */
  build: () => BlueprintComponent;
};

/**
 * Creates and returns a builder for constructing `BlueprintComponent` instances.
 *
 * The builder provides a fluent API for setting various properties of a `BlueprintComponent`
 * and performs validation upon calling the `build` method to ensure the resulting object
 * is valid. If validation fails, an error is thrown.
 *
 * @returns {BlueprintComponentBuilder} An object with methods to configure and build a `BlueprintComponent`.
 *
 * Methods available on the builder:
 * - `withType(type: BlueprintComponentType)`: Sets the type of the component.
 * - `withId(id: ComponentId)`: Sets the unique identifier for the component.
 * - `withVersion(version: Version)`: Sets the version of the component.
 * - `withDisplayName(displayName: string)`: Sets the display name for the component.
 * - `withDescription(description: string)`: Sets a description for the component.
 * - `withParameters(parameters: GenericParameters)`: Sets the parameters associated with the component.
 * - `withLinks(links: ComponentLink[])`: Sets the links associated with the component.
 * - `withDependencies(dependencies: BlueprintComponentDependency[])`: Sets the dependencies of the component.
 * - `reset()`: Resets all properties of the component to their default values based on `DEFAULT_BLUEPRINT_COMPONENT`.
 * - `build()`: Validates and constructs the `BlueprintComponent` object. Throws an error if validation fails.
 */
export const getBlueprintComponentBuilder = (): BlueprintComponentBuilder => {
  const internalState: BlueprintComponent = {
    ...DEFAULT_BLUEPRINT_COMPONENT,
  };

  const builder = {
    withType: (type: BlueprintComponentType) => {
      internalState.type = type;
      return builder;
    },
    withId: (id: ComponentId) => {
      internalState.id = id;
      return builder;
    },
    withVersion: (version: Version) => {
      internalState.version = version;
      return builder;
    },
    withIsLocked: (value: boolean) => {
      internalState.isLocked = value;
      return builder;
    },
    withRecreateOnFailure: (value: boolean) => {
      internalState.recreateOnFailure = value;
      return builder;
    },
    withDisplayName: (displayName: string) => {
      internalState.displayName = displayName;
      return builder;
    },
    withDescription: (description: string) => {
      internalState.description = description;
      return builder;
    },
    withParameters: (parameters: GenericParameters) => {
      internalState.parameters = parameters;
      return builder;
    },
    withLinks: (links: ComponentLink[]) => {
      internalState.links = links;
      return builder;
    },
    withDependencies: (dependencies: BlueprintComponentDependency[]) => {
      internalState.dependencies = dependencies;
      return builder;
    },
    reset: () => {
      internalState.type = DEFAULT_BLUEPRINT_COMPONENT.type;
      internalState.id = DEFAULT_BLUEPRINT_COMPONENT.id;
      internalState.version = DEFAULT_BLUEPRINT_COMPONENT.version;
      internalState.displayName = DEFAULT_BLUEPRINT_COMPONENT.displayName;
      internalState.description = DEFAULT_BLUEPRINT_COMPONENT.description;
      internalState.parameters = DEFAULT_BLUEPRINT_COMPONENT.parameters;
      internalState.links = DEFAULT_BLUEPRINT_COMPONENT.links;
      internalState.dependencies = DEFAULT_BLUEPRINT_COMPONENT.dependencies;
      internalState.isLocked = DEFAULT_BLUEPRINT_COMPONENT.isLocked;
      internalState.recreateOnFailure = DEFAULT_BLUEPRINT_COMPONENT.recreateOnFailure;
      return builder;
    },
    build: (): BlueprintComponent => {
      const validationErrors = isValidBlueprintComponent(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      return {
        ...internalState,
      };
    },
  };

  return builder;
};

