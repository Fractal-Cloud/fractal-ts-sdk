/** ci/credentials/ci_credentials_options.ts — how {@link credentialsFromCi} runs. */
export type CiCredentialsOptions = {
  /** The HTTP client STS requests use. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
};
