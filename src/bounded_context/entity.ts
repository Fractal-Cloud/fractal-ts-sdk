import {isNonEmptyString} from '../values/helpers';
import type {BoundedContext as BoundedContextT} from './';
import {
  DEFAULT_BOUNDED_CONTEXT_ID,
  BoundedContextId,
  isValidBoundedContextId,
} from './id';

const DEFAULT: BoundedContextT = {
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
const isValidBoundedContext = (value: BoundedContextT): string[] => {
  const idErrors = isValidBoundedContextId(value.id);
  const displayNameErrors = isNonEmptyString(value.displayName)
    ? []
    : ['Display name must be a non-empty string'];
  return [
    ...idErrors.map(
      x =>
        `[Bounded Context: ${value.id.toString()}] Id error: ${x}`,
    ),
    ...displayNameErrors.map(
      x =>
        `[Bounded Context: ${value.id.toString()}] Display Name error: ${x}`,
    ),
  ];
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
  build: () => BoundedContextT;
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
  const internalState: BoundedContextT = {
    ...DEFAULT,
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
      internalState.id = DEFAULT.id;
      internalState.displayName = DEFAULT.displayName;
      internalState.description = DEFAULT.description;
      return builder;
    },
    build: (): BoundedContextT => {
      const validationErrors = isValidBoundedContext(internalState);
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
