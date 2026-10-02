/** ci/ci_environment.ts — the process environment a CI adapter reads. */
export type CiEnvironment = Readonly<Record<string, string | undefined>>;
