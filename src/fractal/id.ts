import {
  DEFAULT_KEBAB_CASE_STRING,
  isValidKebabCaseString,
  KebabCaseString,
} from '../values/kebab_case_string';
import {BoundedContext} from '../bounded_context';
import {DEFAULT_VERSION, isValidVersion, Version} from '../values/version';
import {
  DEFAULT_BOUNDED_CONTEXT_ID,
  isValidBoundedContextId,
} from '../bounded_context/id';

/**
 * Represents a unique identifier for a fractal within a system.
 * The FractalId consists of a bounded context identifier, a name in kebab case,
 * a version, and a string representation method.
 *
 * @typedef {Object} FractalId
 * @property {BoundedContext.Id} boundedContextId - The identifier for the bounded context to which the fractal belongs.
 * @property {KebabCaseString} name - The name of the fractal represented in kebab-case format.
 * @property {Version} version - The version of the fractal.
 * @property {function(): string} toString - Returns a string representation of the FractalId.
 */
export type FractalId = {
  boundedContextId: BoundedContext.Id;
  name: KebabCaseString;
  version: Version;
  equals: (other: FractalId) => boolean;
  toString: () => string;
};

const equals = (a: FractalId, b: FractalId): boolean =>
  a.boundedContextId.equals(b.boundedContextId) &&
  a.name.equals(b.name) &&
  a.version.equals(b.version);

const toString = (id: FractalId): string =>
  `${id.boundedContextId.toString()}/${id.name.toString()}:${id.version.toString()}`;

/**
 * Validates a given Fractal ID and returns a list of error messages if any validation fails.
 * The validation process includes checking the bounded context ID, the name, and the version of the Fractal ID.
 *
 * @param {FractalId} id - The Fractal ID to validate.
 * @returns {string[]} An array of error messages. Each error message indicates the specific issue with the bounded context ID, name, or version of the Fractal ID.
 */
export const isValidFractalId = (id: FractalId): string[] => {
  const boundedContextIdErrors = isValidBoundedContextId(id.boundedContextId);
  const nameErrors = isValidKebabCaseString(id.name.value);
  const versionErrors = isValidVersion(id.version);
  return [
    ...boundedContextIdErrors.map(
      x => `[Fractal Id: ${id.toString()}] Bounded Context Id error: ${x}`,
    ),
    ...nameErrors.map(x => `[Fractal Id: ${id.toString()}] Name errors: ${x}`),
    ...versionErrors.map(
      x => `[Fractal Id: ${id.toString()}] Version error: ${x}`,
    ),
  ];
};

/**
 * Represents the default identifier for a fractal instance.
 *
 * This constant holds a predefined FractalId object used as a default configuration
 * in systems where fractal identification is required. The FractalId includes
 * properties such as the bounded context ID, name, and version.
 *
 * The `boundedContextId` corresponds to the default bounded context identifier.
 * The `name` is represented as a default kebab-case string format.
 * The `version` reflects the defined default version of the fractal.
 *
 * DEFAULT_FRACTAL_ID can be used as a fallback or initial value in scenarios
 * where no specific fractal identifier is provided.
 *
 * @constant {FractalId} DEFAULT_FRACTAL_ID
 */
export const DEFAULT_FRACTAL_ID: FractalId = {
  boundedContextId: DEFAULT_BOUNDED_CONTEXT_ID,
  name: DEFAULT_KEBAB_CASE_STRING,
  version: DEFAULT_VERSION,
  equals: () => false,
  toString: () => '',
};

/**
 * Represents a builder for creating and configuring instances of a FractalId.
 * This builder follows a fluent API design, enabling chaining of methods
 * for greater flexibility and readability.
 */
export type FractalIdBuilder = {
  /**
   * Assigns a bounded context identifier to the FractalIdBuilder.
   *
   * @param {BoundedContext.Id} value - The unique identifier for the bounded context to be associated.
   * @returns {FractalIdBuilder} The updated instance of FractalIdBuilder with the specified bounded context ID applied.
   */
  withBoundedContextId: (value: BoundedContext.Id) => FractalIdBuilder;

  /**
   * Assigns a name, in kebab-case format, to the current Fractal ID being constructed.
   *
   * @param {KebabCaseString} name - The name to associate with the Fractal ID. Must follow kebab-case formatting.
   * @returns {FractalIdBuilder} The updated builder instance, allowing for method chaining.
   */
  withName: (name: KebabCaseString) => FractalIdBuilder;

  /**
   * Sets the version information for the FractalIdBuilder instance.
   *
   * @param {Version} version - The version to be associated with the Fractal ID.
   * @returns {FractalIdBuilder} The updated instance of FractalIdBuilder with the specified version.
   */
  withVersion: (version: Version) => FractalIdBuilder;

  /**
   * Resets the state of the current FractalIdBuilder instance to its initial default configuration.
   * This method is typically used to clear any modifications made and start fresh.
   *
   * @returns {FractalIdBuilder} The current instance of FractalIdBuilder for method chaining.
   */
  reset: () => FractalIdBuilder;

  /**
   * Generates a FractalId object based on the current state or configuration.
   *
   * The `build` function serves to construct and return a fully initialized
   * instance of a FractalId. This function encapsulates the logic needed
   * to assemble the FractalId, ensuring all necessary components are properly
   * configured and validated before being returned.
   *
   * @returns {FractalId} A fully constructed FractalId object.
   */
  build: () => FractalId;
};

/**
 * Provides a builder for constructing a `FractalId` object.
 * This builder allows incremental creation of the ID through a fluent API
 * with methods for specifying bounded context ID, name, and version, as well as
 * resetting and building the final object.
 *
 * @returns {FractalIdBuilder} A builder object with methods for constructing a `FractalId`.
 *
 * Methods available on the builder:
 * - `withBoundedContextId(value: BoundedContext.Id)`: Sets the bounded context ID for the `FractalId`.
 * - `withName(value: KebabCaseString)`: Sets the name for the `FractalId`.
 * - `withVersion(value: Version)`: Sets the version for the `FractalId`.
 * - `reset()`: Resets the builder's internal state to default values.
 * - `build()`: Validates and constructs the final `FractalId` object. Throws a `SyntaxError` if validation fails.
 */
export const getFractalIdBuilder = (): FractalIdBuilder => {
  const internalState: FractalId = {
    ...DEFAULT_FRACTAL_ID,
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
    withVersion: (value: Version) => {
      internalState.version = value;
      return builder;
    },
    reset: () => {
      internalState.boundedContextId = DEFAULT_FRACTAL_ID.boundedContextId;
      internalState.name = DEFAULT_FRACTAL_ID.name;
      internalState.version = DEFAULT_FRACTAL_ID.version;
      return builder;
    },
    build: (): FractalId => {
      const validationErrors = isValidFractalId(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }

      const builtId: FractalId = {
        ...internalState,
        equals: (other: FractalId) => equals(builtId, other),
        toString: () => toString(builtId),
      };

      return builtId;
    },
  };

  return builder;
};
