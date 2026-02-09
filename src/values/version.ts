/**
 * Represents a semantic version following the major.minor.patch format.
 *
 * This type is used to define a version number, where:
 * - `major` indicates the major version, typically incremented for incompatible API changes.
 * - `minor` indicates the minor version, incremented for backwards-compatible enhancements or features.
 * - `patch` indicates the patch version, incremented for backwards-compatible bug fixes.
 */
export type Version = {
  major: number;
  minor: number;
  patch: number;
  equals: (other: Version) => boolean;
  toString: () => string;
};

const equals = (a: Version, b: Version): boolean =>
  a.major === b.major && a.minor === b.minor && a.patch === b.patch;

const toString = (version: Version): string =>
  `v${version.major}.${version.minor}.${version.patch}`;

/**
 * Builder interface for constructing version objects.
 * Provides a fluent API for setting version components.
 */
export type VersionBuilder = {
  /**
   * Sets the major version number.
   * @param major - The major version number
   * @returns The builder instance for method chaining
   */
  withMajor: (major: number) => VersionBuilder;

  /**
   * Sets the minor version number.
   * @param minor - The minor version number
   * @returns The builder instance for method chaining
   */
  withMinor: (minor: number) => VersionBuilder;

  /**
   * Sets the patch version number.
   * @param patch - The patch version number
   * @returns The builder instance for method chaining
   */
  withPatch: (patch: number) => VersionBuilder;

  /**
   * Resets the version to default values (0.0.0).
   * @returns The builder instance for method chaining
   */
  reset: () => VersionBuilder;

  /**
   * Constructs and returns the final version object.
   * @returns The constructed Version object
   * @throws {SyntaxError} If the version is not initialized
   */
  build: () => Version;
};

/**
 * Represents the default version for an application or library.
 *
 * This variable is declared as a constant to prevent modification
 * and is designed to not pass validation checks.
 */
export const DEFAULT_VERSION: Version = {
  major: 0,
  minor: 0,
  patch: 0,
  equals: (other: Version) =>
    equals(DEFAULT_VERSION, other),
} as const;

/**
 * Validates if the provided version object is properly initialized or equivalent to the default version.
 *
 * @param {Version} version - The version object to be validated.
 * @returns {string[]} An array of error messages. If the version is equivalent to the default version, it returns
 *                     an array containing one error message. Otherwise, it returns an empty array.
 */
export const isValidVersion = (version: Version): string[] => {
  if (equals(version, DEFAULT_VERSION)) {
    return ['Version must be initialized'];
  }
  return [] as const;
};

/**
 * Creates a builder object for constructing and managing version objects.
 * The builder allows for setting major, minor, and patch versions, resetting to defaults,
 * and building the final version object. The default version is considered uninitialized and
 * an error is thrown if build is called without initializing the version.
 *
 * @function getVersionBuilder
 * @returns {VersionBuilder} Returns a builder object with methods to define and construct a version.
 *
 * - `withMajor(major: number): builder`
 *   Sets the major version number and returns the builder.
 *
 * - `withMinor(minor: number): builder`
 *   Sets the minor version number and returns the builder.
 *
 * - `withPatch(patch: number): builder`
 *   Sets the patch version number and returns the builder.
 *
 * - `reset(): builder`
 *   Resets the version to the default values (major: 0, minor: 0, patch: 0) and returns the builder.
 *
 * - `build(): Version`
 *   Constructs and returns the final version object. Throws a `SyntaxError` if the version
 *   is not initialized (when it matches the default version).
 */
export const getVersionBuilder = (): VersionBuilder => {
  const internalState: Version = {
    ...DEFAULT_VERSION,
  };

  const builder = {
    withMajor: (major: number) => {
      internalState.major = major;
      if (major < 0) {
        throw new RangeError('Major version must be non-negative');
      }
      return builder;
    },
    withMinor: (minor: number) => {
      if (minor < 0) {
        throw new RangeError('Minor version must be non-negative');
      }
      internalState.minor = minor;
      return builder;
    },
    withPatch: (patch: number) => {
      if (patch < 0) {
        throw new RangeError('Patch version must be non-negative');
      }
      internalState.patch = patch;
      return builder;
    },
    reset: () => {
      internalState.major = DEFAULT_VERSION.major;
      internalState.minor = DEFAULT_VERSION.minor;
      internalState.patch = DEFAULT_VERSION.patch;
      return builder;
    },
    build: (): Version => {
      const validationErrors = isValidVersion(internalState);
      if (validationErrors.length > 0) {
        throw new SyntaxError(validationErrors.join('\n'));
      }
      const builtVersion: Version = {
        ...internalState,
        equals: (other: Version) => equals(builtVersion, other),
        toString: () => toString(builtVersion),
      };

      return builtVersion;
    },
  };

  return builder;
};

export namespace Version {
  export const getBuilder = getVersionBuilder;
}
