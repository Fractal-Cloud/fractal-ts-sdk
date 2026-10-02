/**
 * ci/adapters/azure_devops_identity.ts — ADAPTER: Azure Pipelines OIDC tokens.
 *
 * `POST $(System.OidcRequestUri)?api-version=7.1&serviceConnectionId=<id>` with
 * `Authorization: Bearer $(System.AccessToken)` answers `{oidcToken}` (the
 * Distributed Task "Oidctoken - Create" API). `System.AccessToken` is not in a
 * script's environment unless the step maps it: `env: SYSTEM_ACCESSTOKEN:
 * $(System.AccessToken)`.
 *
 * The issued token's audience is always `api://AzureADTokenExchange`; it cannot
 * be chosen. A GCP workload identity provider or an AWS IAM OIDC provider that
 * trusts an Azure DevOps organization must therefore accept that audience.
 */
import type {CiEnvironment} from '../ci_environment';
import type {CiIdentity} from '../ci_identity';
import type {AzureDevOpsIdentityOptions} from './azure_devops_identity_options';
import {present} from './present';

const AZURE_DEVOPS_AUDIENCE = 'api://AzureADTokenExchange';

export const azureDevOpsIdentity = (
  env: CiEnvironment = process.env,
  options: AzureDevOpsIdentityOptions = {},
  fetchFn: typeof fetch = fetch,
): CiIdentity => ({
  fixedAudience: AZURE_DEVOPS_AUDIENCE,
  idToken: async audience => {
    if (audience !== AZURE_DEVOPS_AUDIENCE) {
      throw new Error(
        `Azure DevOps issues OIDC tokens for '${AZURE_DEVOPS_AUDIENCE}' only, not '${audience}'. ` +
          `Configure the cloud to accept '${AZURE_DEVOPS_AUDIENCE}' and leave its audience unset ` +
          '(or set it to that value).',
      );
    }
    const requestUri = present(env, 'SYSTEM_OIDCREQUESTURI');
    if (requestUri === undefined) {
      throw new Error(
        'No Azure DevOps OIDC token available: SYSTEM_OIDCREQUESTURI is not set.',
      );
    }
    const accessToken = present(env, 'SYSTEM_ACCESSTOKEN');
    if (accessToken === undefined) {
      throw new Error(
        'No Azure DevOps OIDC token available: SYSTEM_ACCESSTOKEN is not set. Map it into the ' +
          'step: env: SYSTEM_ACCESSTOKEN: $(System.AccessToken)',
      );
    }
    const serviceConnectionId =
      options.serviceConnectionId ??
      present(env, 'AZURESUBSCRIPTION_SERVICE_CONNECTION_ID');
    if (serviceConnectionId === undefined) {
      throw new Error(
        'No Azure DevOps service connection to mint an OIDC token for: pass serviceConnectionId ' +
          'or set AZURESUBSCRIPTION_SERVICE_CONNECTION_ID.',
      );
    }
    const url = new URL(requestUri);
    url.searchParams.set('api-version', '7.1');
    url.searchParams.set('serviceConnectionId', serviceConnectionId);
    const res = await fetchFn(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(
        `Azure DevOps refused an OIDC token for service connection '${serviceConnectionId}' (HTTP ${res.status}).`,
      );
    }
    const body = (await res.json()) as {oidcToken?: unknown};
    if (typeof body.oidcToken !== 'string' || body.oidcToken.length === 0) {
      throw new Error(
        `Azure DevOps returned no OIDC token for service connection '${serviceConnectionId}'.`,
      );
    }
    return body.oidcToken;
  },
});
