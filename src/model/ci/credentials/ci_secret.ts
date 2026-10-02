/**
 * ci/credentials/ci_secret.ts — refer to a CI variable by name instead of
 * reading it at process start: `ciSecret('AWS_SECRET_ACCESS_KEY')`.
 *
 * It is read only when a credential is about to be used, and a variable the job
 * was not given means the cloud is not configured for this job, which is what
 * lets one script serve per-cloud jobs that each map only their own secrets.
 */
import type {CiSecretRef} from './ci_secret_ref';

export const ciSecret = (name: string): CiSecretRef => {
  if (name.trim().length === 0) {
    throw new Error('ciSecret() needs the name of a CI variable.');
  }
  return {ciSecret: name};
};
