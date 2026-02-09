/**
 * Represents a type definition for Parameters, which provides methods to retrieve required
 * and optional fields by their corresponding names.
 *
 * @typedef {Object} GenericParameters
 *
 * @property {Function} getRequiredFieldByName - Retrieves a required field by its name.
 *   Expects a string as input representing the field name and returns a record where keys
 *   are of type string and values are objects.
 *
 * @property {Function} getOptionalFieldByName - Retrieves an optional field by its name.
 *   Expects a string as input representing the field name and returns a record where keys
 *   are of type string and values are objects.
 */
export type GenericParameters = {
  getRequiredFieldByName: (name: string) => Record<string, object>;
  getOptionalFieldByName: (name: string) => Record<string, object>;
  getAllFieldNames: () => string[];
  push: (key: string, value: Record<string, object>) => void;
  remove: (key: string) => void;
  toMap: () => Record<string, object>;
};

/**
 * Provides a mechanism to manage and retrieve named fields from an internal container.
 *
 * This function returns an object with methods to access required and optional fields by name.
 * It utilizes an internal container to store field data, enabling controlled retrieval of fields.
 *
 * @returns {GenericParameters} An object containing methods for field retrieval:
 *   - `getRequiredFieldByName`: Retrieves a specified field by name. Throws an error if the field is not defined.
 *   - `getOptionalFieldByName`: Retrieves a specified field by name. Returns null if the field is not defined.
 */
export const getParametersInstance = (): GenericParameters => {
  const container = {} as Record<string, Record<string, object>>;

  return {
    getRequiredFieldByName: (name: string) => {
      if (typeof container[name] === 'undefined' || container[name] === null) {
        throw new Error(`Required field ${name} is not defined`);
      }
      return container[name];
    },
    getOptionalFieldByName: (name: string) => container[name] ?? null,
    getAllFieldNames: () => Object.keys(container),
    push: (key: string, value: Record<string, object>) => container[key] = value,
    remove: (key: string) => delete container[key],
    toMap: () => ({
      ...container
    }),
  };
};
