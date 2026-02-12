import {
  DEFAULT_KEBAB_CASE_STRING,
  isValidKebabCaseString,
  KebabCaseString,
} from '../values/kebab_case_string';

/**
 * Represents a unique identifier for a component, adhering to a kebab-case format.
 * Provides functionality to compare two ComponentId instances for equality.
 *
 * @typedef {Object} ComponentId
 * @property {KebabCaseString} value - The string representation of the component identifier in kebab-case format.
 * @property {function(ComponentId): boolean} equals - A method to check if the given ComponentId is equal to the current instance.
 */
export type ComponentId = {
  value: KebabCaseString;
  equals: (other: ComponentId) => boolean;
  toString: () => string;
};

/**
 * Validates whether the given identifier is in a valid kebab-case format.
 *
 * @param {ComponentId} id - The identifier object to validate, containing the value to check.
 * @returns {boolean} - Returns true if the identifier is in a valid kebab-case format, false otherwise.
 */
export const isValidId = (id: ComponentId): string[] => {
  return isValidKebabCaseString(id.value.toString()).map(
    x => `[Component Id: ${id.value.toString()}] Id error: ${x}`,
  );
};

const equals = (a: ComponentId, b: ComponentId): boolean => a.value === b.value;

/**
 * Represents the default identifier used in the application.
 * It is initialized with a value that will not pass validation.
 */
export const DEFAULT_COMPONENT_ID: ComponentId = {
  value: DEFAULT_KEBAB_CASE_STRING,
  equals: (other: ComponentId) => equals(DEFAULT_COMPONENT_ID, other),
  toString: () => '',
};

/**
 * Builder interface for constructing ComponentId instances.
 *
 * The builder follows a fluent API pattern, allowing method chaining to configure
 * the component identifier before building the final instance. It validates the
 * component ID upon build and throws a SyntaxError if validation fails.
 *
 * @example
 * ```typescript
 * const componentId = getComponentIdBuilder()
 *   .withValue(someKebabCaseString)
 *   .build();
 * ```
 */
export type ComponentIdBuilder = {
  /**
   * Sets the kebab-case string value for the component identifier.
   *
   * @param {KebabCaseString} value - The kebab-case string value to use for the component ID.
   * @returns {ComponentIdBuilder} The builder instance for method chaining.
   */
  withValue: (value: KebabCaseString) => ComponentIdBuilder;

  /**
   * Resets the builder to its default state, clearing all configured values.
   *
   * @returns {ComponentIdBuilder} The builder instance for method chaining.
   */
  reset: () => ComponentIdBuilder;

  /**
   * Constructs and validates the ComponentId instance.
   *
   * @returns {ComponentId} The constructed and validated component identifier.
   * @throws {SyntaxError} If the component ID fails validation.
   */
  build: () => ComponentId;
};

/**
 * Creates and returns a builder for constructing a `ComponentId` object.
 *
 * The builder provides methods to set properties of the `ComponentId`, reset them to default
 * values, and validate and build the final object. The `build` method performs validation before
 * creating the `ComponentId`, and throws an error if any validation rules are violated.
 *
 * @returns {ComponentIdBuilder} A builder with methods to configure and build a `ComponentId`.
 */
export const getComponentIdBuilder = (): ComponentIdBuilder => {
  const internalState: ComponentId = {
    ...DEFAULT_COMPONENT_ID,
  };

  const builder = {
    withValue: (value: KebabCaseString) => {
      internalState.value = value;
      return builder;
    },
    reset: () => {
      internalState.value = DEFAULT_COMPONENT_ID.value;
      internalState.equals = DEFAULT_COMPONENT_ID.equals;
      return builder;
    },
    build: (): ComponentId => {
      const validationErrors = isValidId(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      const builtId: ComponentId = {
        ...internalState,
        equals: (other: ComponentId) => equals(builtId, other),
        toString: () => builtId.value.toString(),
      };

      return builtId;
    },
  };

  return builder;
};
