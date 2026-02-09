import {isValidUuid} from "./guid";

/**
 * Represents a unique identifier for a service account.
 *
 * This type is used to encapsulate the value of a service account's unique ID as a string.
 */
export type ServiceAccountId = {
  serviceAccountIdValue: string
};

/**
 * A builder type to facilitate the construction of a `ServiceAccountId` object.
 * Provides methods for setting values, resetting the builder's state, and creating the final `ServiceAccountId`.
 */
export type ServiceAccountIdBuilder = {
  /**
   * Sets a value to the builder for constructing a ServiceAccountId.
   *
   * @param {string} value - The value to be assigned to the builder.
   * @returns {ServiceAccountIdBuilder} The instance of the builder with the specified value set.
   */
  withValue: (value: string) => ServiceAccountIdBuilder;

  /**
   * Resets the current state of the ServiceAccountIdBuilder instance, clearing any previously set values
   * and returning the builder to its initial state.
   *
   * @returns {ServiceAccountIdBuilder} The current instance of the ServiceAccountIdBuilder for method chaining.
   */
  reset: () => ServiceAccountIdBuilder;

  /**
   * A method that initiates the creation or retrieval of a `ServiceAccountId`.
   *
   * @function
   * @returns {ServiceAccountId} - The generated or fetched service account identifier.
   */
  build: () => ServiceAccountId;
};

/**
 * Represents the default service account identifier used in the application.
 * This value is typically utilized to associate operations or resources with the
 * default service account when no specific account is provided.
 *
 * @constant {ServiceAccountId}
 */
export const DEFAULT_SERVICE_ACCOUNT_ID: ServiceAccountId = {
  serviceAccountIdValue: '',
} as const;

/**
 * Validates whether the provided value is a valid service account ID.
 *
 * The function determines validity by checking if the given value is a valid UUID.
 * It returns an array of validation error messages if the value is invalid;
 * otherwise, it returns an empty array.
 *
 * @param {string} value - The value to be validated as a service account ID.
 * @returns {string[]} An array of validation errors, or an empty array if valid.
 */
export const isValidServiceAccountId = (value: ServiceAccountId): string[] => {
  if (!value || !value.serviceAccountIdValue) {
    return ['Value must be a non-empty string'];
  }

  return isValidUuid(value.serviceAccountIdValue);
}

/**
 * Creates and returns a builder object for constructing a ServiceAccountId.
 *
 * The builder provides methods to configure and build a ServiceAccountId, ensuring
 * that the resulting object adheres to the required validation rules.
 *
 * @returns {ServiceAccountIdBuilder} A builder instance used to configure and construct
 * a ServiceAccountId object.
 *
 * The builder provides the following functionalities:
 * - `withValue(value: string)`: Sets the `value` for the ServiceAccountId. The provided
 *   value must be a valid UUID; otherwise, a `RangeError` is thrown.
 * - `reset()`: Resets the `value` to the default value specified by `DEFAULT_SERVICE_ACCOUNT_ID`.
 * - `build()`: Constructs the ServiceAccountId object. If the current state contains
 *   validation errors, a `SyntaxError` is thrown with the list of validation messages.
 *
 * The builder maintains an internal mutable state that is used to apply configurations
 * incrementally until `build()` is called to produce the final ServiceAccountId object.
 */
export const getServiceAccountIdBuilder = (): ServiceAccountIdBuilder => {
  const internalState: ServiceAccountId = {
    ...DEFAULT_SERVICE_ACCOUNT_ID,
  };

  const builder = {
    withValue: (value: string) => {
      internalState.serviceAccountIdValue = value;
      return builder;
    },
    reset: () => {
      internalState.serviceAccountIdValue = DEFAULT_SERVICE_ACCOUNT_ID.serviceAccountIdValue;
      return builder;
    },
    build: (): ServiceAccountId => {
      const validationErrors = isValidServiceAccountId(internalState);
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

export namespace ServiceAccountId {
  export const getBuilder = getServiceAccountIdBuilder;
}
