/** ci/credentials/aws_signing_input.ts — one request to sign with SigV4. */
export type AwsSigningInput = {
  method: string;
  url: string;
  /** Headers to sign besides `host` and `x-amz-date` (lower-case names). */
  headers: Readonly<Record<string, string>>;
  body: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  /** The signing time. Default: now. */
  now?: Date;
};
