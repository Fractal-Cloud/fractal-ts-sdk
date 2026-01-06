import {Component} from './';
import {ComponentType, DEFAULT_TYPE, isValidType} from './type';
import {DEFAULT_VERSION, isValidVersion, Version} from '../values/version';
import {ComponentParameters, getParametersInstance} from './parameters';
import {ComponentId, DEFAULT_COMPONENT_ID, isValidId} from './id';
import {isNonEmptyString} from '../values/string';
import {ComponentLink} from './link';
import {Dependency} from './dependency';

/**
 * Represents an object structure where the `value` field contains
 * a record of key-value pairs. The keys are strings, and the values
 * are objects.
 *
 * This type is typically used to structure output data and ensure
 * a consistent schema in which string keys map to object values.
 *
 * Example usage of this type might involve representing data returned
 * from a service or API, where the output follows a defined format.
 */
export type ComponentOutputFields = {
  value: Record<string, object>;
};

const DEFAULT: Component = {
  type: DEFAULT_TYPE,
  id: DEFAULT_COMPONENT_ID,
  version: DEFAULT_VERSION,
  displayName: '',
  description: '',
  parameters: getParametersInstance(),
  outputFields: {value: {}},
  links: [],
  dependencies: [],
} as const;

const isValidComponent = (component: Component): string[] => {
  const idErrors = isValidId(component.id);
  const typeErrors = isValidType(component.type);
  const versionErrors = isValidVersion(component.version);
  const displayNameErrors = isNonEmptyString(component.displayName)
    ? []
    : ['Display name must be a non-empty string'];
  return [
    ...idErrors.map(x => `[Component: ${component.id.value}] Id error: ${x}`),
    ...typeErrors.map(
      x => `[Component: ${component.id.value}] Type error: ${x}`,
    ),
    ...versionErrors.map(
      x => `[Component: ${component.id.value}] Version error: ${x}`,
    ),
    ...typeErrors.map(
      x => `[Component: ${component.id.value}] Type error: ${x}`,
    ),
    ...displayNameErrors.map(
      x => `[Component: ${component.id.value}] Display Name error: ${x}`,
    ),
  ];
};

/**
 * A builder interface for constructing Component objects in a fluent and type-safe manner.
 *
 * The ComponentBuilder provides methods to configure a Component's properties step-by-step,
 * validate the configuration, and produce an immutable Component instance. It follows
 * the builder pattern, allowing method chaining for a more readable API.
 *
 * @typedef {Object} ComponentBuilder
 */
export type ComponentBuilder = {
  /**
   * Sets the type for the component being built.
   *
   * @param {ComponentType} type - The type to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withType: (type: ComponentType) => ComponentBuilder;

  /**
   * Sets the identifier for the component being built.
   *
   * @param {ComponentId} id - The unique identifier to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withId: (id: ComponentId) => ComponentBuilder;

  /**
   * Sets the version for the component being built.
   *
   * @param {Version} version - The version to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withVersion: (version: Version) => ComponentBuilder;

  /**
   * Sets the display name for the component being built.
   *
   * @param {string} displayName - The display name to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withDisplayName: (displayName: string) => ComponentBuilder;

  /**
   * Sets the description for the component being built.
   *
   * @param {string} description - The description to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withDescription: (description: string) => ComponentBuilder;

  /**
   * Sets the parameters for the component being built.
   *
   * @param {ComponentParameters} parameters - The parameters to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withParameters: (parameters: ComponentParameters) => ComponentBuilder;

  /**
   * Sets the links for the component being built.
   *
   * @param {ComponentLink[]} links - The links to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withLinks: (links: ComponentLink[]) => ComponentBuilder;

  /**
   * Sets the dependencies for the component being built.
   *
   * @param {Dependency[]} dependencies - The dependencies to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withDependencies: (dependencies: Dependency[]) => ComponentBuilder;

  /**
   * Resets the builder's internal state to default values.
   *
   * This method clears all previously configured properties and returns
   * the builder to its initial state, allowing it to be reused for
   * constructing a new Component instance.
   *
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  reset: () => ComponentBuilder;

  /**
   * Validates and constructs the final Component object.
   *
   * This method performs validation on the configured properties to ensure
   * the Component is valid (id, type, version, and display name must be valid).
   * If validation fails, a SyntaxError is thrown.
   *
   * @returns {Component} An immutable Component instance with the configured properties.
   * @throws {SyntaxError} If the component configuration is invalid.
   */
  build: () => Component;
};

/**
 * Creates and returns a builder for constructing `Component` objects.
 *
 * The `getComponentBuilder` function provides a fluent interface for configuring a `Component` instance.
 * It allows setting properties such as `type`, `id`, `version`, `displayName`, `description`, `parameters`,
 * `links`, and `dependencies`. The builder maintains an internal state to incrementally configure the `Component` object.
 *
 * Functions exposed by the builder:
 *
 * - `withType(type: ComponentType): ComponentBuilder`: Assigns the provided `type` to the `Component`.
 * - `withId(id: ComponentId): ComponentBuilder`: Assigns the provided `id` to the `Component`.
 * - `withVersion(version: Version): ComponentBuilder`: Assigns the provided `version` to the `Component`.
 * - `withDisplayName(displayName: string): ComponentBuilder`: Assigns the provided `displayName` to the `Component`.
 * - `withDescription(description: string): ComponentBuilder`: Assigns the provided `description` to the `Component`.
 * - `withParameters(parameters: ComponentParameters): ComponentBuilder`: Assigns the provided `parameters` to the `Component`.
 * - `withLinks(links: ComponentLink[]): ComponentBuilder`: Assigns the provided `links` to the `Component`.
 * - `withDependencies(dependencies: Dependency[]): ComponentBuilder`: Assigns the provided `dependencies` to the `Component`.
 * - `reset(): ComponentBuilder`: Resets the builder state to its default values.
 * - `build(): Component`: Validates the internal state and constructs an immutable `Component` instance.
 *
 * Throws:
 * - `SyntaxError` if the internal state is invalid when invoking `build()`.
 *
 * @returns {ComponentBuilder} The builder object to configure and construct `Component` instances.
 */
export const getComponentBuilder = (): ComponentBuilder => {
  const internalState: Component = {
    ...DEFAULT,
  };

  const builder = {
    withType: (type: ComponentType) => {
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
    withDisplayName: (displayName: string) => {
      internalState.displayName = displayName;
      return builder;
    },
    withDescription: (description: string) => {
      internalState.description = description;
      return builder;
    },
    withParameters: (parameters: ComponentParameters) => {
      internalState.parameters = parameters;
      return builder;
    },
    withLinks: (links: ComponentLink[]) => {
      internalState.links = links;
      return builder;
    },
    withDependencies: (dependencies: Dependency[]) => {
      internalState.dependencies = dependencies;
      return builder;
    },
    reset: () => {
      internalState.type = DEFAULT.type;
      internalState.id = DEFAULT.id;
      internalState.displayName = DEFAULT.displayName;
      internalState.description = DEFAULT.description;
      return builder;
    },
    build: (): Component => {
      const validationErrors = isValidComponent(internalState);
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
