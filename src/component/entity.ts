import {Component} from './';
import {
  ComponentType,
  DEFAULT_COMPONENT_TYPE,
  isValidComponentType,
} from './type';
import {DEFAULT_VERSION, isValidVersion, Version} from '../values/version';
import {getParametersInstance} from '../values/generic_parameters';
import {ComponentId, DEFAULT_COMPONENT_ID, isValidId} from './id';
import {isNonEmptyString} from '../values/helpers';
import {ComponentLink} from './link';
import {ComponentDependency} from './dependency';

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

/**
 * Represents the default configuration for a component within the system.
 * This constant can be used as a template or fallback value when no specific component configuration is available.
 *
 * Properties of this constant include:
 * - `type`: The default component type identifier.
 * - `id`: The unique identifier for the default component.
 * - `version`: The version of the default component.
 * - `displayName`: An empty string representing a placeholder for the display name.
 * - `description`: An empty string serving as a placeholder for the component description.
 * - `parameters`: Default parameters for the component, retrieved from a predefined instance.
 * - `outputFields`: The default output fields structure with a nested empty object under `value`.
 * - `links`: An empty array indicating no predefined links for the default configuration.
 * - `dependencies`: An empty array representing no external dependencies.
 */
export const DEFAULT_COMPONENT: Component = {
  type: DEFAULT_COMPONENT_TYPE,
  id: DEFAULT_COMPONENT_ID,
  version: DEFAULT_VERSION,
  displayName: '',
  description: '',
  parameters: getParametersInstance(),
  outputFields: {value: {}},
  links: [],
  dependencies: [],
} as const;

/**
 * Validates a given component object and returns a list of error messages if any validations fail.
 *
 * The function checks the following properties of the `component`:
 * - `id`: Assessed using the `isValidId` function.
 * - `type`: Assessed using the `isValidComponentType` function.
 * - `version`: Assessed using the `isValidVersion` function.
 * - `displayName`: Validated to ensure it is a non-empty string.
 *
 * Validation errors are returned as strings formatted with the component's ID for easy identification.
 *
 * @param {Component} component - The component object to validate. Must include the fields `id`, `type`, `version`, and `displayName`.
 * @returns {string[]} An array of error messages, each describing a specific validation failure. If no errors are found, the array will be empty.
 */
export const isValidComponent = (component: Component): string[] => {
  const idErrors = addContextToErrors(component.id, isValidId(component.id));
  const typeErrors = addContextToErrors(
    component.id,
    isValidComponentType(component.type),
  );
  const versionErrors = addContextToErrors(
    component.id,
    isValidVersion(component.version),
  );
  const displayNameErrors = addContextToErrors(
    component.id,
    isNonEmptyString(component.displayName)
      ? []
      : ['Display name must be a non-empty string'],
  );
  return [
    ...idErrors,
    ...typeErrors,
    ...versionErrors,
    ...typeErrors,
    ...displayNameErrors,
  ];
};

const addContextToErrors = (
  componentId: ComponentId,
  errors: string[],
): string[] => {
  return errors.map(error => `[Component: ${componentId.toString()}]${error}`);
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
   * @param {Component.Parameters} parameters - The parameters to associate with the component.
   * @returns {ComponentBuilder} The builder instance for method chaining.
   */
  withParameters: (parameters: Component.Parameters) => ComponentBuilder;

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
  withDependencies: (dependencies: ComponentDependency[]) => ComponentBuilder;

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
    ...DEFAULT_COMPONENT,
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
    withParameters: (parameters: Component.Parameters) => {
      internalState.parameters = parameters;
      return builder;
    },
    withLinks: (links: ComponentLink[]) => {
      internalState.links = links;
      return builder;
    },
    withDependencies: (dependencies: ComponentDependency[]) => {
      internalState.dependencies = dependencies;
      return builder;
    },
    reset: () => {
      internalState.type = DEFAULT_COMPONENT.type;
      internalState.id = DEFAULT_COMPONENT.id;
      internalState.version = DEFAULT_COMPONENT.version;
      internalState.displayName = DEFAULT_COMPONENT.displayName;
      internalState.description = DEFAULT_COMPONENT.description;
      internalState.parameters = DEFAULT_COMPONENT.parameters;
      internalState.links = DEFAULT_COMPONENT.links;
      internalState.dependencies = DEFAULT_COMPONENT.dependencies;
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
