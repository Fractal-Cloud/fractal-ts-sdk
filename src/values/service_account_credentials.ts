import {
  DEFAULT_SERVICE_ACCOUNT_ID,
  isValidServiceAccountId,
  ServiceAccountId,
} from './service_account_id';

/**
 * Represents the credentials used for a service account.
 * This includes the service account's unique identifier and secret key.
 * The credentials are typically used for authenticating and authorizing
 * access to services or APIs on behalf of the service account.
 */
export type ServiceAccountCredentials = {
  id: ServiceAccountId;
  secret: string;
};

/**
 * Represents a builder for creating service account credentials.
 */
export type ServiceAccountCredentialsBuilder = {
  /**
   * Assigns a specific `ServiceAccountId` to the builder object.
   *
   * @param {ServiceAccountId} value - The unique identifier for the service account.
   * @returns {ServiceAccountCredentialsBuilder} The updated builder instance for chaining.
   */
  withId: (value: ServiceAccountId) => ServiceAccountCredentialsBuilder;

  /**
   * Attaches a secret to the service account credentials builder.
   *
   * This method allows you to provide a secret value that will be associated with the
   * service account credentials being constructed. The secret is typically used
   * for authentication purposes or secure communication with external services.
   *
   * @param {string} value - The secret value to be attached.
   * @returns {ServiceAccountCredentialsBuilder} The updated instance of the service account credentials builder.
   */
  withSecret: (value: string) => ServiceAccountCredentialsBuilder;

  /**
   * Resets the current state of the ServiceAccountCredentialsBuilder instance,
   * clearing any previously set data and restoring it to its initial default state.
   *
   * @returns {ServiceAccountCredentialsBuilder} The current instance of the builder for method chaining.
   */
  reset: () => ServiceAccountCredentialsBuilder;

  /**
   * A function that constructs and returns an instance of ServiceAccountCredentials.
   * Typically used to build credentials required for authenticating or authorizing
   * service account interactions.
   *
   * @function
   * @returns {ServiceAccountCredentials} The generated service account credentials.
   */
  build: () => ServiceAccountCredentials;
};

const DEFAULT_SERVICE_ACCOUNT_CREDENTIALS: ServiceAccountCredentials = {
  id: DEFAULT_SERVICE_ACCOUNT_ID,
  secret: '',
} as const;

/**
 * Validates the provided service account credentials and returns a list of validation errors.
 *
 * @param {ServiceAccountCredentials} value - The service account credentials to validate.
 * @returns {string[]} - An array of error messages, where each message describes a validation issue.
 *                       If the credentials are valid, the array is empty.
 */
export const isValidServiceAccountCredentials = (
  value: ServiceAccountCredentials,
): string[] => {
  const idErrors = isValidServiceAccountId(value.id);
  const secretErrors = value.secret
    ? []
    : ['Secret must be a non-empty string'];
  return [...idErrors, ...secretErrors];
};

/**
 * Creates and returns a builder for constructing service account credentials.
 *
 * The builder provides methods to configure and validate a `ServiceAccountCredentials` object.
 * It includes support for setting the `id` and `secret`, resetting to default values,
 * and finalizing the construction by ensuring the credentials are valid.
 *
 * @returns {ServiceAccountCredentialsBuilder} A builder object to construct `ServiceAccountCredentials`.
 */
export const getServiceAccountCredentialsBuilder =
  (): ServiceAccountCredentialsBuilder => {
    const internalState: ServiceAccountCredentials = {
      ...DEFAULT_SERVICE_ACCOUNT_CREDENTIALS,
    };

    const builder = {
      withId: (value: ServiceAccountId) => {
        internalState.id = value;
        return builder;
      },
      withSecret: (value: string) => {
        internalState.secret = value;
        return builder;
      },
      reset: () => {
        internalState.id = DEFAULT_SERVICE_ACCOUNT_CREDENTIALS.id;
        internalState.secret = DEFAULT_SERVICE_ACCOUNT_CREDENTIALS.secret;
        return builder;
      },
      build: (): ServiceAccountCredentials => {
        const validationErrors =
          isValidServiceAccountCredentials(internalState);
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

export namespace ServiceAccountCredentials {
  export const getBuilder = getServiceAccountCredentialsBuilder;
}
