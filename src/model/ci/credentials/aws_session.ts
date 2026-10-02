/** ci/credentials/aws_session.ts — three-part AWS session credentials. */
export type AwsSession = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
};
