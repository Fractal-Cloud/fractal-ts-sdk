/** Offers over the secret-access fixture contracts. */
import {defineOffer} from '../../../core';
import type {ContractConfig} from '../contract_config';
import {
  Fixture_FaaS_Plain,
  Fixture_FaaS_SecretReader,
} from './secret_access_contracts';

export const SecretReader = defineOffer<
  'CustomWorkloads.Function',
  ContractConfig<typeof Fixture_FaaS_SecretReader>
>({
  satisfies: 'CustomWorkloads.Function',
  contract: Fixture_FaaS_SecretReader,
  provider: 'GCP',
  deliveryModel: 'FaaS',
});

export const PlainFunction = defineOffer<
  'CustomWorkloads.Function',
  ContractConfig<typeof Fixture_FaaS_Plain>
>({
  satisfies: 'CustomWorkloads.Function',
  contract: Fixture_FaaS_Plain,
  provider: 'GCP',
  deliveryModel: 'FaaS',
});

/** A flagged offer whose `instantiate` forgets the selection. */
export const ForgetfulSecretReader = defineOffer<
  'CustomWorkloads.Function',
  ContractConfig<typeof Fixture_FaaS_SecretReader>
>({
  satisfies: 'CustomWorkloads.Function',
  contract: Fixture_FaaS_SecretReader,
  provider: 'GCP',
  deliveryModel: 'FaaS',
  instantiate: ctx => [
    {
      id: ctx.id,
      displayName: ctx.displayName,
      type: Fixture_FaaS_SecretReader.offerType,
      provider: 'GCP',
      deliveryModel: 'FaaS',
      parameters: {},
      dependencies: ctx.dependencies,
      links: ctx.links,
    },
  ],
});
