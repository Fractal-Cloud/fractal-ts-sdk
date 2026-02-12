import {BoundedContext} from '../bounded_context';
import {
  DEFAULT_KEBAB_CASE_STRING,
  isValidKebabCaseString,
  KebabCaseString,
} from '../values/kebab_case_string';
import {
  DEFAULT_BOUNDED_CONTEXT_ID,
  isValidBoundedContextId,
} from '../bounded_context/id';

/**
 * Represents the unique identifier for a live system instance in a specific bounded context.
 *
 * @typedef {Object} LiveSystemId
 * @property {BoundedContext.Id} boundedContextId - The identifier of the bounded context associated with the live system.
 * @property {KebabCaseString} name - The name of the live system in kebab-case format.
 * @property {function(): string} toString - A method that converts the live system identifier to its string representation.
 */
export type LiveSystemId = {
  boundedContextId: BoundedContext.Id;
  name: KebabCaseString;
  toString: () => string;
};

const toString = (id: LiveSystemId): string =>
  `${id.boundedContextId.toString()}/${id.name.value}`;

/**
 * Validates the specified LiveSystemId and returns a list of error messages.
 *
 * The validation process includes checking the validity of the bounded context ID
 * and the name associated with the LiveSystemId.
 *
 * @param {LiveSystemId} id - The LiveSystemId object to be validated. It contains
 *                            a bounded context ID and a name in kebab-case format.
 * @returns {string[]} An array of error messages generated during validation. Each error message
 *                     is prepended with the string representation of the provided LiveSystemId for context.
 */
export const isValidLiveSystemId = (id: LiveSystemId): string[] => {
  const boundedContextIdErrors = isValidBoundedContextId(id.boundedContextId);
  const nameErrors = isValidKebabCaseString(id.name.value);
  return [
    ...boundedContextIdErrors.map(
      x => `[Fractal Id: ${id.toString()}] Bounded Context Id error: ${x}`,
    ),
    ...nameErrors.map(x => `[Fractal Id: ${id.toString()}] Name errors: ${x}`),
  ];
};

/**
 * Represents the default identifier for a live system within a bounded context.
 *
 * This constant is used to define the default configuration for a live system by associating a
 * predefined bounded context identifier with a default name in kebab-case format.
 *
 * Fields:
 * - `boundedContextId`: Identifies the default bounded context to which the live system belongs.
 * - `name`: Specifies the default name of the live system in a standardized kebab-case string format.
 */
export const DEFAULT_LIVE_SYSTEM_ID: LiveSystemId = {
  boundedContextId: DEFAULT_BOUNDED_CONTEXT_ID,
  name: DEFAULT_KEBAB_CASE_STRING,
};

/**
 * A builder for creating instances of LiveSystemId. Allows setting various properties
 * before producing the final immutable LiveSystemId object.
 */
export type LiveSystemIdBuilder = {
  /**
   * Sets the bounded context identifier for the live system ID builder.
   *
   * This method assigns a specific bounded context ID to the builder, enabling it
   * to associate the resulting system identifiers with the provided context. The
   * bounded context ID uniquely identifies the context within which the system
   * operates, ensuring logical separation and consistency across different systems.
   *
   * @param {BoundedContext.Id} value - The unique identifier of the bounded context.
   * @returns {LiveSystemIdBuilder} The builder instance with the bounded context ID applied.
   */
  withBoundedContextId: (value: BoundedContext.Id) => LiveSystemIdBuilder;

  /**
   * A method that assigns a name to the builder object.
   *
   * @param {KebabCaseString} name - The name to be set, formatted as a kebab-case string.
   * @returns {LiveSystemIdBuilder} Returns an updated instance of the LiveSystemIdBuilder.
   */
  withName: (name: KebabCaseString) => LiveSystemIdBuilder;

  /**
   * Resets the current state of the LiveSystemIdBuilder instance to its initial configuration.
   *
   * @returns {LiveSystemIdBuilder} A new instance of LiveSystemIdBuilder with default settings.
   */
  reset: () => LiveSystemIdBuilder;

  /**
   * Represents a function that generates or retrieves a `LiveSystemId`.
   * The function is intended to construct or return an identifier for
   * a live system component, which may represent an active or dynamic
   * system entity.
   *
   * @function
   * @returns {LiveSystemId} A unique identifier for a live system.
   */
  build: () => LiveSystemId;
};

/**
 * Creates and returns a `LiveSystemIdBuilder` to construct and validate `LiveSystemId` objects.
 *
 * The builder provides a fluent API for setting properties and validating the resulting `LiveSystemId`.
 *
 * @returns {LiveSystemIdBuilder} A builder object with methods to configure, reset, and build a `LiveSystemId`.
 *
 * Methods available in the builder:
 * - `withBoundedContextId(value: BoundedContext.Id)`: Sets the bounded context ID for the `LiveSystemId`.
 * - `withName(value: KebabCaseString)`: Sets the name for the `LiveSystemId`.
 * - `reset()`: Resets all properties to their default values as defined in `DEFAULT_LIVE_SYSTEM_ID`.
 * - `build()`: Validates the current state of the builder and constructs a `LiveSystemId` object. Throws a `SyntaxError` if validation fails.
 */
export const getLiveSystemIdBuilder = (): LiveSystemIdBuilder => {
  const internalState: LiveSystemId = {
    ...DEFAULT_LIVE_SYSTEM_ID,
  };

  const builder = {
    withBoundedContextId: (value: BoundedContext.Id) => {
      internalState.boundedContextId = value;
      return builder;
    },
    withName: (value: KebabCaseString) => {
      internalState.name = value;
      return builder;
    },
    reset: () => {
      internalState.boundedContextId = DEFAULT_LIVE_SYSTEM_ID.boundedContextId;
      internalState.name = DEFAULT_LIVE_SYSTEM_ID.name;
      return builder;
    },
    build: (): LiveSystemId => {
      const validationErrors = isValidLiveSystemId(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      const builtId: LiveSystemId = {
        ...internalState,
        toString: () => toString(builtId),
      };

      return builtId;
    },
  };

  return builder;
};
