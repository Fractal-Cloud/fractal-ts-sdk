/**
 * messaging_messagingentity.test.ts
 *
 * M3 migration proof for the Messaging "Entity" capability under the Fractal +
 * Interface model. Mirrors samples/storage_relationaldatabase.test.ts and
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose MessagingEntity abstract component
 *     carries the candidate Offers (AzureServiceBusTopic/Azure,
 *     AzureServiceBusQueue/Azure, AzureEventHub/Azure on Azure;
 *     GcpPubSubTopic/GCP, GcpPubSubSubscription/GCP on GCP).
 *   - A dev specializes through the Interface only (set `messageRetentionHours`,
 *     `azureRegion`, `azureResourceGroup`), never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Entity offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {MessagingEntity} from '../fractal/component/messaging/paas/entity';
import {AzureServiceBusTopic} from '../live_system/component/messaging/paas/azure_service_bus_topic';
import {AzureServiceBusQueue} from '../live_system/component/messaging/paas/azure_service_bus_queue';
import {AzureEventHub} from '../live_system/component/messaging/paas/azure_eventhub';
import {GcpPubSubTopic} from '../live_system/component/messaging/paas/gcp_pubsub_topic';
import {GcpPubSubSubscription} from '../live_system/component/messaging/paas/gcp_pubsub_subscription';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {getComponentIdBuilder} from '../component/id';
import {getLinkBuilder} from '../component/link';
import {getComponentTypeBuilder} from '../component/type';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {PascalCaseString} from '../values/pascal_case_string';
import {getParametersInstance} from '../values/generic_parameters';
import {LiveSystemComponent} from '../live_system/component';

// ── fixtures ─────────────────────────────────────────────────────────────────

const kebab = (v: string) => KebabCaseString.getBuilder().withValue(v).build();

const ownerId = OwnerId.getBuilder()
  .withValue('00000000-0000-0000-0000-000000000001')
  .build();

const boundedContextId = getBoundedContextIdBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(ownerId)
  .withName(kebab('reusable-templates'))
  .build();

const environment = getEnvironmentBuilder()
  .withId(
    getEnvironmentIdBuilder()
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(ownerId)
      .withName(kebab('test'))
      .build(),
  )
  .build();

// A dependency (the hosting Broker) and a link the abstract component declares —
// both must be inherited by whichever offer the provider selects.
const brokerDependencyId = getComponentIdBuilder()
  .withValue(kebab('broker'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('linked-thing')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.Messaging)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorMessagingFractal() {
  return createFractal({
    id: 'messaging',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed messaging entity',
    boundedContextId,
    blueprint: bp => ({
      entity: bp.add(
        MessagingEntity.create({
          id: 'entity',
          displayName: 'App Messaging Entity',
          offers: [
            AzureServiceBusTopic,
            AzureServiceBusQueue,
            AzureEventHub,
            GcpPubSubTopic,
            GcpPubSubSubscription,
          ],
          dependencies: [{id: brokerDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withMessageRetentionHours: (hours: number) =>
        bp.entity.set('messageRetentionHours', hours),
      withAzureRegion: (region: string) => bp.entity.set('azureRegion', region),
      withAzureResourceGroup: (rg: string) =>
        bp.entity.set('azureResourceGroup', rg),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorMessagingFractal();
  fractal.operations.withMessageRetentionHours(72);
  fractal.operations.withAzureRegion('westeurope');
  fractal.operations.withAzureResourceGroup('rg-messaging');
  return fractal.toLiveSystem({name: 'acme-messaging', environment, provider});
}

describe('MessagingEntity Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    // Azure resolves to the first Azure candidate (AzureServiceBusTopic),
    // GCP to the first GCP candidate (GcpPubSubTopic).
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Messaging.PaaS.ServiceBusTopic'],
      ['GCP', 'Messaging.PaaS.PubSubTopic'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const entity = ls.components.find(c => c.id.toString() === 'entity')!;
      expect(entity).toBeDefined();
      expect(entity.type.toString()).toBe(expectedType);
      expect(entity.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const azureEntity = specialize('Azure').components.find(
      c => c.id.toString() === 'entity',
    )!;
    const gcpEntity = specialize('GCP').components.find(
      c => c.id.toString() === 'entity',
    )!;

    // neutral params set via the interface — identical across providers
    expect(
      azureEntity.parameters.getOptionalFieldByName('messageRetentionHours'),
    ).toBe(72);
    expect(azureEntity.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(
      azureEntity.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toBe('rg-messaging');
    expect(
      azureEntity.parameters.getOptionalFieldByName('messageRetentionHours'),
    ).toEqual(
      gcpEntity.parameters.getOptionalFieldByName('messageRetentionHours'),
    );
    expect(
      azureEntity.parameters.getOptionalFieldByName('azureRegion'),
    ).toEqual(gcpEntity.parameters.getOptionalFieldByName('azureRegion'));

    // declared dependency + link inherited by every offer
    for (const entity of [azureEntity, gcpEntity]) {
      expect(entity.dependencies.some(d => d.id.toString() === 'broker')).toBe(
        true,
      );
      expect(entity.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('messaging');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorMessagingFractal().blueprint;
    const entity = blueprint.components.find(
      c => c.id.toString() === 'entity',
    )!;

    expect(entity.services).toBeDefined();
    // All five offers share the PaaS delivery model → one Service.
    const serviceTypes = entity.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Messaging.PaaS.Entity']);

    const offerTypes = entity
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Messaging.PaaS.EventHub',
      'Messaging.PaaS.PubSubTopic',
      'Messaging.PaaS.ServiceBusQueue',
      'Messaging.PaaS.ServiceBusTopic',
      'Messaging.PaaS.Subscription',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorMessagingFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-messaging',
        environment,
        provider: 'AWS',
      }),
    ).toThrow(/No Entity offer/);
  });
});
