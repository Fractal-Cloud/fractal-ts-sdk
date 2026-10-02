/** ci/credentials/ci_cloud.ts — the one cloud a CI job holds credentials for,
 *  in either spelling (so it can come straight from a CI variable). */
export type CiCloud = 'AWS' | 'GCP' | 'AZURE' | 'aws' | 'gcp' | 'azure';
