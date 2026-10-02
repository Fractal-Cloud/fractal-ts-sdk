/** ci/credentials/ci_secret_ref.ts — a value the CI passes the job as a
 *  variable (normally a mapped secret), read when it is needed. */
export type CiSecretRef = {readonly ciSecret: string};
