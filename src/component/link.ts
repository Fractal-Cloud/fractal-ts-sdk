import {ComponentType, DEFAULT_TYPE, isValidType} from './type';
import {DEFAULT_COMPONENT_ID, ComponentId, isValidId} from './id';

/**
 * Represents a link object with an identifier, type, and associated settings.
 *
 * @typedef {Object} ComponentLink
 * @property {ComponentId} id - The unique identifier for the link.
 * @property {ComponentType} type - The type of the link, indicating its category or purpose.
 * @property {Record<string, object>} settings - A dictionary of configuration settings,
 * where keys are setting names and values are their corresponding configuration objects.
 */
export type ComponentLink = {
  id: ComponentId;
  type: ComponentType;
  settings: LinkSettings;
};

/**
 * Represents a settings configuration object.
 *
 * This type is used to define a mapping of keys to corresponding configuration objects.
 * Each key is a string, and its associated value is an object containing configuration details.
 */
export type LinkSettings = {
  value: Record<string, object>;
};

/**
 * A function to determine if a given ComponentLink is valid.
 *
 * This function checks the validity of a ComponentLink object by verifying
 * the validity of its `id` and `type` properties.
 *
 * @param {ComponentLink} link - The ComponentLink object to validate.
 * @returns {boolean} - Returns true if the link's `id` is valid and its `type` is valid; otherwise, returns false.
 */
export const isValidLink = (link: ComponentLink): string[] => {
  const idErrors = isValidId(link.id);
  const typeErrors = isValidType(link.type);
  return [
    ...idErrors.map(x => `[Link: ${link.id.value}] Id error: ${x}`),
    ...typeErrors.map(x => `[Link: ${link.id.value}] Type error: ${x}`),
  ];
};

const DEFAULT_LINK: ComponentLink = {
  id: DEFAULT_COMPONENT_ID,
  type: DEFAULT_TYPE,
  settings: {
    value: {},
  },
};

/**
 * A builder interface for constructing ComponentLink objects in a fluent and type-safe manner.
 *
 * The LinkBuilder provides methods to configure a ComponentLink's properties step-by-step,
 * validate the configuration, and produce an immutable ComponentLink instance. It follows
 * the builder pattern, allowing method chaining for a more readable API.
 *
 * @typedef {Object} LinkBuilder
 */
export type LinkBuilder = {
  /**
   * Sets the identifier for the link being built.
   *
   * @param {ComponentId} id - The unique identifier to associate with the link.
   * @returns {LinkBuilder} The builder instance for method chaining.
   */
  withId: (id: ComponentId) => LinkBuilder;

  /**
   * Sets the type for the link being built.
   *
   * @param {ComponentType} type - The type to associate with the link.
   * @returns {LinkBuilder} The builder instance for method chaining.
   */
  withType: (type: ComponentType) => LinkBuilder;

  /**
   * Sets the settings for the link being built.
   *
   * @param {LinkSettings} settings - The configuration settings to associate with the link.
   * @returns {LinkBuilder} The builder instance for method chaining.
   */
  withSettings: (settings: LinkSettings) => LinkBuilder;

  /**
   * Resets the builder's internal state to default values.
   *
   * This method clears all previously configured properties and returns
   * the builder to its initial state, allowing it to be reused for
   * constructing a new ComponentLink instance.
   *
   * @returns {LinkBuilder} The builder instance for method chaining.
   */
  reset: () => LinkBuilder;

  /**
   * Validates and constructs the final ComponentLink object.
   *
   * This method performs validation on the configured properties to ensure
   * the ComponentLink is valid (id must be initialized and type must be valid).
   * If validation fails, a SyntaxError is thrown.
   *
   * @returns {ComponentLink} An immutable ComponentLink instance with the configured properties.
   * @throws {SyntaxError} If the link configuration is invalid.
   */
  build: () => ComponentLink;
};

/**
 * Creates and returns a builder for constructing `ComponentLink` objects.
 *
 * The `getLinkBuilder` function provides a fluent interface for configuring a `ComponentLink` instance.
 * It allows setting properties such as `id`, `type`, and `settings`. The builder maintains an internal
 * state to incrementally configure the `ComponentLink` object.
 *
 * Functions exposed by the builder:
 *
 * - `withId(id: ComponentId): LinkBuilder`: Assigns the provided `id` to the `ComponentLink`.
 * - `withType(type: ComponentType): LinkBuilder`: Assigns the provided `type` to the `ComponentLink`.
 * - `withSettings(settings: LinkSettings): LinkBuilder`: Assigns the provided `settings` to the `ComponentLink`.
 * - `reset(): LinkBuilder`: Resets the builder state to its default values.
 * - `build(): ComponentLink`: Validates the internal state and constructs an immutable `ComponentLink` instance.
 *
 * Throws:
 * - `SyntaxError` if the internal state is invalid when invoking `build()`.
 *
 * @returns {LinkBuilder} The builder object to configure and construct `ComponentLink` instances.
 */
export const getLinkBuilder = (): LinkBuilder => {
  const internalState: ComponentLink = {
    ...DEFAULT_LINK,
  };

  const builder = {
    withId: (id: ComponentId) => {
      internalState.id = id;
      return builder;
    },
    withType: (type: ComponentType) => {
      internalState.type = type;
      return builder;
    },
    withSettings: (settings: LinkSettings) => {
      internalState.settings = settings;
      return builder;
    },
    reset: () => {
      internalState.id = DEFAULT_LINK.id;
      internalState.type = DEFAULT_LINK.type;
      internalState.settings = DEFAULT_LINK.settings;
      return builder;
    },
    build: (): ComponentLink => {
      const validationErrors = isValidLink(internalState);
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
