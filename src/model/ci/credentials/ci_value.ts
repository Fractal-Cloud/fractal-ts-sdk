/** ci/credentials/ci_value.ts — a credential value given inline, or read from a
 *  CI variable at the moment it is needed ({@link ciSecret}). */
import type {CiSecretRef} from './ci_secret_ref';

export type CiValue = string | CiSecretRef;
