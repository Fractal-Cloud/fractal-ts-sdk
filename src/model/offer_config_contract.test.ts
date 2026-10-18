/**
 * offer_config_contract.test.ts — value constraints come from the agents'
 * published contracts: every parameter an offer emits for its own offer type
 * is checked against that contract (type, allowed values, constraints) while the Live System is built, whether it came from the
 * offer's config, a neutral translation or an Interface operation. The SDK
 * hand-writes no per-parameter value checks. Required keys are the config
 * type's and the control plane's (which may supply them, e.g. IPAM CIDRs).
 */
import {describe, expect, it} from 'vitest';
import {createFractal} from './core';
import {DistributedDataProcessing} from './components/big_data';
import {Broker, MessagingEntity} from './components/messaging';
import {AwsDatabricks} from './offers/big_data';
import {AwsSnsTopic, AzureServiceBus} from './offers/messaging';
import {secretRef} from './secret';

const environment = {};
const boundedContextId = {name: 'contracts'};
const version = {major: 1, minor: 0, patch: 0};

const databricks = (config: Record<string, unknown>) =>
  createFractal({
    id: 'dbx',
    version,
    boundedContextId,
    blueprint: bp => ({ws: bp.add(DistributedDataProcessing({id: 'ws'}))}),
  }).toLiveSystem({
    name: 'dbx',
    environment,
    select: {
      ws: AwsDatabricks({
        credentialsId: 'cred',
        storageConfigurationId: 'store',
        pricingTier: 'premium',
        ...config,
      } as never),
    },
  });

const topic = (config: Record<string, unknown>) =>
  createFractal({
    id: 'sns',
    version,
    boundedContextId,
    blueprint: bp => ({events: bp.add(MessagingEntity({id: 'events'}))}),
  }).toLiveSystem({
    name: 'sns',
    environment,
    select: {events: AwsSnsTopic(config as never)},
  });

describe('offer config against its contract', () => {
  it('refuses a value outside the contract vocabulary, naming the allowed values', () => {
    expect(() => databricks({pricingTier: 'gold'})).toThrow(
      "Live component 'ws': \"gold\" is not one of standard, premium, enterprise for 'pricingTier'.",
    );
  });

  it('compares the vocabulary case-insensitively when the contract says so', () => {
    expect(() => databricks({pricingTier: 'Enterprise'})).not.toThrow();
  });

  it('refuses a value of the wrong type', () => {
    expect(() => topic({maximumMessageSize: 'big'})).toThrow(
      "Live component 'events': (value withheld) is not the integer 'maximumMessageSize' takes.",
    );
    expect(() => topic({maximumMessageSize: 4096})).not.toThrow();
  });

  it('takes an environment-secret reference for any key, which the agent resolves first', () => {
    expect(() => topic({maximumMessageSize: secretRef('size')})).not.toThrow();
  });

  // The contract check found this one: the neutral 'at-rest' was sent to the
  // Service Bus agent's `encryption`, a customer-managed-key map.
  it('does not send the neutral encryption to Service Bus, whose key means a customer-managed key', () => {
    const bus = (encryption: 'at-rest' | 'none') =>
      createFractal({
        id: 'bus',
        version,
        boundedContextId,
        blueprint: bp => ({
          bus: bp.add(Broker({id: 'bus'}).withEncryption(encryption)),
        }),
      }).toLiveSystem({
        name: 'bus',
        environment,
        select: {bus: AzureServiceBus({})},
      });
    expect(bus('at-rest').components[0].parameters).not.toHaveProperty(
      'encryption',
    );
    expect(() => bus('none')).toThrow(/Service Bus always encrypts at rest/);
  });
});
