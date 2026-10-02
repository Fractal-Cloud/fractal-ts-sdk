/**
 * ci/adapters/github_actions_identity.ts — ADAPTER: GitHub Actions OIDC tokens.
 *
 * A job gets `ACTIONS_ID_TOKEN_REQUEST_URL` / `_TOKEN` only with
 * `permissions: id-token: write`. The token's `sub` names the repository and,
 * when the job declares one, its GitHub environment, which is what a cloud's
 * trust policy should pin.
 */
import type {CiEnvironment} from '../ci_environment';
import type {CiIdentity} from '../ci_identity';
import {present} from './present';

export const githubActionsIdentity = (
  env: CiEnvironment = process.env,
  fetchFn: typeof fetch = fetch,
): CiIdentity => ({
  idToken: async audience => {
    const requestUrl = present(env, 'ACTIONS_ID_TOKEN_REQUEST_URL');
    const requestToken = present(env, 'ACTIONS_ID_TOKEN_REQUEST_TOKEN');
    if (requestUrl === undefined || requestToken === undefined) {
      throw new Error(
        'No GitHub Actions OIDC token available: ACTIONS_ID_TOKEN_REQUEST_URL / _TOKEN are not set. ' +
          "The job needs 'permissions: id-token: write'.",
      );
    }
    const url = new URL(requestUrl);
    url.searchParams.set('audience', audience);
    const res = await fetchFn(url.toString(), {
      headers: {Authorization: `Bearer ${requestToken}`},
    });
    if (!res.ok) {
      // The body is not quoted: nothing in it helps more than the status does.
      throw new Error(
        `GitHub Actions refused an OIDC token for audience '${audience}' (HTTP ${res.status}).`,
      );
    }
    const body = (await res.json()) as {value?: unknown};
    if (typeof body.value !== 'string' || body.value.length === 0) {
      throw new Error(
        `GitHub Actions returned no OIDC token for audience '${audience}'.`,
      );
    }
    return body.value;
  },
});
