/**
 * neutral_encryption.test.ts — the neutral `withEncryption('at-rest' | 'none')`
 * on every offer whose vendor always encrypts at rest.
 *
 * 'at-rest' is what the platform already does, so it is satisfied and NOT sent:
 * on Azure the contract key of the same name is the agent's customer-managed-key
 * object, and the neutral string sent there was refused as "not the object
 * 'encryption' takes", naming no fix (samples basic_storage/azure, SDK 2.13.0).
 * 'none' is refused, naming the fix. A customer-managed key stays possible
 * through the vendor's own `encryption` key on the Azure offers.
 */
import {describe, expect, it} from 'vitest';
import {createFractal, type Offer} from './core';
import {Broker} from './components/messaging';
import {ObjectStorage} from './components/storage';
import {AzureServiceBus, GcpPubSub} from './offers/messaging';
import {AwsS3, AzureBlob, GcsBucket} from './offers/storage';

const version = {major: 1, minor: 0, patch: 0};
const boundedContextId = {name: 'encryption'};

const bucket = (encryption: 'at-rest' | 'none', offer: Offer) =>
  createFractal({
    id: 'store',
    version,
    boundedContextId,
    blueprint: bp => ({
      uploads: bp.add(
        ObjectStorage({id: 'uploads'}).withEncryption(encryption),
      ),
    }),
  }).toLiveSystem({name: 'store', environment: {}, select: {uploads: offer}});

const broker = (encryption: 'at-rest' | 'none', offer: Offer) =>
  createFractal({
    id: 'bus',
    version,
    boundedContextId,
    blueprint: bp => ({
      bus: bp.add(Broker({id: 'bus'}).withEncryption(encryption)),
    }),
  }).toLiveSystem({name: 'bus', environment: {}, select: {bus: offer}});

type Case = [
  name: string,
  build: (encryption: 'at-rest' | 'none') => ReturnType<typeof bucket>,
  offerType: string,
  id: string,
  reason: string,
];

const cases: Case[] = [
  [
    'AwsS3',
    e => bucket(e, AwsS3({})),
    'Storage.PaaS.AwsS3',
    'uploads',
    'S3 always encrypts at rest',
  ],
  [
    'AzureBlob',
    e => bucket(e, AzureBlob({})),
    'Storage.PaaS.AzureBlob',
    'uploads',
    "Azure Storage always encrypts at rest; a customer-managed key is set with AzureBlob's own encryption",
  ],
  [
    'GcsBucket',
    e => bucket(e, GcsBucket({})),
    'Storage.PaaS.GcpGcsBucket',
    'uploads',
    'Cloud Storage always encrypts at rest',
  ],
  [
    'AzureServiceBus',
    e => broker(e, AzureServiceBus({})),
    'Messaging.PaaS.AzureServiceBus',
    'bus',
    "Service Bus always encrypts at rest; a customer-managed key is set with AzureServiceBus's own encryption",
  ],
  [
    'GcpPubSub',
    e => broker(e, GcpPubSub({})),
    'Messaging.PaaS.GcpPubSub',
    'bus',
    'Pub/Sub always encrypts at rest',
  ],
];

describe.each(cases)(
  '%s and withEncryption',
  (_, build, offerType, id, reason) => {
    it("satisfies 'at-rest' without sending it", () => {
      const [component] = build('at-rest').components;
      expect(component.type).toBe(offerType);
      expect(component.parameters).not.toHaveProperty('encryption');
    });

    it("refuses 'none', naming the fix", () => {
      expect(() => build('none')).toThrow(
        `Offer ${offerType}, selected for '${id}', cannot honor withEncryption ` +
          "('encryption'), a guardrail locked in the Fractal: " +
          `${reason}. Fix: select an offer for '${id}' whose agent supports ` +
          `withEncryption, or remove withEncryption from '${id}' in the Fractal.`,
      );
    });
  },
);

describe('a customer-managed key through the vendor key', () => {
  const blobKey = {
    keySource: 'Microsoft.Keyvault',
    keyVaultProperties: {
      keyName: 'uploads',
      keyVaultUri: 'https://acme.vault.azure.net/',
    },
  };
  const busKey = {
    keyVaultProperties: [
      {keyVaultUri: 'https://acme.vault.azure.net/', keyName: 'bus'},
    ],
  };

  it('AzureBlob sends its own encryption alongside the neutral at-rest', () => {
    const [c] = bucket('at-rest', AzureBlob({encryption: blobKey})).components;
    expect(c.parameters.encryption).toEqual(blobKey);
  });

  it('AzureServiceBus sends its own encryption alongside the neutral at-rest', () => {
    const [c] = broker(
      'at-rest',
      AzureServiceBus({encryption: busKey}),
    ).components;
    expect(c.parameters.encryption).toEqual(busKey);
  });

  it('still refuses a vendor encryption that is not the object the agent takes', () => {
    expect(() =>
      bucket('at-rest', AzureBlob({encryption: 'cmk' as never})),
    ).toThrow("is not the object 'encryption' takes");
  });
});
