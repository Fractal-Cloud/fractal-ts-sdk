/**
 * environment/provider_credentials_not_configured.ts — the signal that THIS run
 * holds no credentials for a cloud, as opposed to holding the wrong ones.
 *
 * A `providerCredentials` resolver throws it for a cloud it was not configured
 * for. `environments.deploy` then skips that agent with a notice when
 * `missingCredentials: 'skip'` (so one CI job per cloud can each deploy the whole
 * tree), and fails otherwise. Any other resolver error, such as a refused
 * account, always fails the deploy.
 */
import type {EnvironmentId, ProviderType} from './types';

export class ProviderCredentialsNotConfigured extends Error {
  constructor(
    readonly provider: ProviderType,
    readonly environment: EnvironmentId,
    detail?: string,
  ) {
    super(
      `No ${provider} credentials are configured for this run` +
        (detail === undefined ? '.' : `: ${detail}`),
    );
    this.name = 'ProviderCredentialsNotConfigured';
  }
}
