import {isNonEmptyString} from './values/string';
import {
  BoundedContextId,
  DEFAULT_BOUNDED_CONTEXT_ID,
  isValidBoundedContextId,
} from './bounded_context_id';

/**
 * Represents a bounded context in a domain-driven design framework.
 * A bounded context defines a specific boundary within which a particular model is defined and used, encapsulating domain logic and avoiding ambiguity with other models.
 *
 * @typedef {Object} BoundedContext
 * @property {BoundedContextId} id - A unique identifier for the bounded context.
 * @property {string} displayName - A human-readable name for the bounded context.
 * @property {string} [description] - An optional description providing additional details about the bounded context's purpose or scope.
 */
export type BoundedContext = {
  id: BoundedContextId;
  displayName: string;
  description?: string;
};

/**
 * Represents the default bounded context utilized within the application.
 * A bounded context is a central pattern in domain-driven design, defining a specific
 * responsibility or area of the domain model with clear boundaries.
 *
 * This constant provides a preconfigured bounded context with a default identifier and
 * an empty display name. It is primarily used as a fallback or initial default in scenarios
 * where no other bounded context is explicitly specified.
 *
 * Properties:
 * - `id`: Represents the unique identifier for the bounded context, initialized with the
 *   value of `DEFAULT_BOUNDED_CONTEXT_ID`.
 * - `displayName`: Represents the display name of the bounded context, initialized as an empty string.
 */
export const DEFAULT_BOUNDED_CONTEXT: BoundedContext = {
  id: DEFAULT_BOUNDED_CONTEXT_ID,
  displayName: '',
} as const;

/**
 * Determines whether the given bounded context object is valid.
 *
 * The validation checks if the bounded context contains:
 * - A valid bounded context ID, verified through the `isValidBoundedContextId` function.
 * - A non-empty string as the display name, verified through the `isNonEmptyString` function.
 *
 * @param {BoundedContext} value - The bounded context object to be validated.
 * @returns {boolean} Returns true if the bounded context is valid; otherwise, returns false.
 */
export const isValidBoundedContext = (value: BoundedContext): boolean =>
  isValidBoundedContextId(value.id) && isNonEmptyString(value.displayName);

/**
 * Creates a builder for constructing a BoundedContext object with a fluid API.
 *
 * The `getBoundedContextBuilder` function returns an object with methods that allow incremental construction
 * of a `BoundedContext` instance. It ensures validation at the `build()` step and supports resets
 * to default values.
 *
 * @function
 * @returns {BoundedContextBuilder} A builder object for creating a `BoundedContext` instance.
 *
 * @throws {SyntaxError} Thrown when attempting to build a `BoundedContext` instance
 * that is invalid, such as when required fields are not initialized.
 */
/**
 * Builder interface for constructing BoundedContext objects.
 * Provides a fluent API for setting and validating bounded context properties.
 */
export type BoundedContextBuilder = {
  /**
   * Sets the ID of the BoundedContext.
   * @param id - The unique identifier for the bounded context
   * @returns The builder instance for method chaining
   */
  withId: (id: BoundedContextId) => BoundedContextBuilder;

  /**
   * Sets the display name of the BoundedContext.
   * @param displayName - The human-readable name for the bounded context
   * @returns The builder instance for method chaining
   */
  withDisplayName: (displayName: string) => BoundedContextBuilder;

  /**
   * Sets the description of the BoundedContext.
   * @param description - An optional description providing additional details about the bounded context's purpose or scope
   * @returns The builder instance for method chaining
   */
  withDescription: (description: string) => BoundedContextBuilder;

  /**
   * Resets the builder to its default state, clearing all current values.
   * @returns The builder instance for method chaining
   */
  reset: () => BoundedContextBuilder;

  /**
   * Constructs and returns the final BoundedContext object.
   * @returns The constructed BoundedContext object
   * @throws {SyntaxError} If the bounded context is invalid (e.g., missing required fields)
   */
  build: () => BoundedContext;
};

/**
 * Creates a builder for constructing a BoundedContext object with a fluid API.
 *
 * The `getBoundedContextBuilder` function returns an object with methods that allow incremental construction
 * of a `BoundedContext` instance. It ensures validation at the `build()` step and supports resets
 * to default values.
 *
 * @function
 * @returns {BoundedContextBuilder} A builder object for creating a `BoundedContext` instance.
 *
 * @throws {SyntaxError} Thrown when attempting to build a `BoundedContext` instance
 * that is invalid, such as when required fields are not initialized.
 */
export const getBoundedContextBuilder = (): BoundedContextBuilder => {
  const internalState: BoundedContext = {
    ...DEFAULT_BOUNDED_CONTEXT,
  };

  const builder = {
    withId: (id: BoundedContextId) => {
      internalState.id = id;
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
    reset: () => {
      internalState.id = DEFAULT_BOUNDED_CONTEXT.id;
      internalState.displayName = DEFAULT_BOUNDED_CONTEXT.displayName;
      internalState.description = DEFAULT_BOUNDED_CONTEXT.description;
      return builder;
    },
    build: (): BoundedContext => {
      if (!isValidBoundedContext(internalState)) {
        throw new SyntaxError(
          ' Bounded Context is invalid. Id must be initialized and display name must be defined',
        );
      }
      return {
        ...internalState,
      } as const;
    },
  };

  return builder;
};
