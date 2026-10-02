/**
 * ci/credentials/aws_sigv4.ts — AWS Signature Version 4, enough to call STS
 * with long-lived keys without pulling the AWS SDK into this package.
 *
 * Verified against AWS's published example request (see the test). The secret
 * key only ever enters the HMAC; it is never placed in a header or the body.
 */
import {createHash, createHmac} from 'node:crypto';
import type {AwsSigningInput} from './aws_signing_input';

const sha256 = (data: string): string =>
  createHash('sha256').update(data, 'utf8').digest('hex');

const hmac = (key: Buffer | string, data: string): Buffer =>
  createHmac('sha256', key).update(data, 'utf8').digest();

/** RFC 3986 encoding, as SigV4 requires (encodeURIComponent leaves !'()* alone). */
const rfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const canonicalQuery = (url: URL): string =>
  [...url.searchParams.entries()]
    .map(([k, v]) => [rfc3986(k), rfc3986(v)] as const)
    .sort(([a, av], [b, bv]) =>
      a === b ? (av < bv ? -1 : av > bv ? 1 : 0) : a < b ? -1 : 1,
    )
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

/** `yyyymmddThhmmssZ`. */
const amzDate = (d: Date): string =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** The headers to send: the input's own plus `host`, `x-amz-date`,
 *  `x-amz-security-token` (when a session token is given) and `authorization`. */
export const signAwsRequest = (
  input: AwsSigningInput,
): Record<string, string> => {
  const url = new URL(input.url);
  const date = amzDate(input.now ?? new Date());
  const day = date.slice(0, 8);
  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(input.headers).map(([k, v]) => [k.toLowerCase(), v]),
    ),
    host: url.host,
    'x-amz-date': date,
  };
  if (input.sessionToken !== undefined) {
    headers['x-amz-security-token'] = input.sessionToken;
  }
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(';');
  const canonicalRequest = [
    input.method.toUpperCase(),
    url.pathname === '' ? '/' : url.pathname,
    canonicalQuery(url),
    names.map(n => `${n}:${headers[n].trim().replace(/\s+/g, ' ')}\n`).join(''),
    signedHeaders,
    sha256(input.body),
  ].join('\n');
  const scope = `${day}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    date,
    scope,
    sha256(canonicalRequest),
  ].join('\n');
  const signingKey = hmac(
    hmac(
      hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region),
      input.service,
    ),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');
  return {
    ...headers,
    authorization:
      `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
};
