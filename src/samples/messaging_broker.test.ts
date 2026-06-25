/**
 * messaging_broker.test.ts
 *
 * M3 migration proof for the Messaging "Broker" capability under the Fractal +
 * Interface model. Mirrors samples/storage_relationaldatabase.test.ts and
 * samples/network_and_compute_virtual_network_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Broker abstract component carries
 *     the candidate Offers (AzureServiceBus/Azure, AzureRelay/Azure,
 *     AzureEventHubNamespace/Azure, GcpPubSub/GCP).
 *   - A dev specializes through the Interface only (set `azureRegion`,
 *     `azureResourceGroup`, `sku`), never naming a vendor offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Broker offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {Broker} from '../fractal/component/messaging/paas/broker';
import {AzureServiceBus} from '../live_system/component/messaging/paas/azure_service_bus';
import {AzureRelay} from '../live_system/component/messaging/paas/azure_relay';
import {AzureEventHubNamespace} from '../live_system/component/messaging/paas/azure_eventhub_namespace';
import {GcpPubSub} from '../live_system/component/messaging/paas/gcp_pubsub';
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

// A dependency and a link the abstract component declares — both must be
// inherited by whichever offer the provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('some-prerequisite'))
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
function authorBrokerFractal() {
  return createFractal({
    id: 'broker',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed message broker',
    boundedContextId,
    blueprint: bp => ({
      broker: bp.add(
        Broker.create({
          id: 'broker',
          displayName: 'Event Broker',
          offers: [
            AzureServiceBus,
            AzureRelay,
            AzureEventHubNamespace,
            GcpPubSub,
          ],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withAzureRegion: (region: string) => bp.broker.set('azureRegion', region),
      withAzureResourceGroup: (rg: string) =>
        bp.broker.set('azureResourceGroup', rg),
      withSku: (sku: string) => bp.broker.set('sku', sku),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorBrokerFractal();
  fractal.operations.withAzureRegion('westeurope');
  fractal.operations.withAzureResourceGroup('my-rg');
  fractal.operations.withSku('Standard');
  return fractal.toLiveSystem({name: 'acme-broker', environment, provider});
}

describe('Broker Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    // Azure resolves to the first Azure candidate (AzureServiceBus).
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['Azure', 'Messaging.PaaS.ServiceBus'],
      ['GCP', 'Messaging.PaaS.PubSub'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const broker = ls.components.find(c => c.id.toString() === 'broker')!;
      expect(broker).toBeDefined();
      expect(broker.type.toString()).toBe(expectedType);
      expect(broker.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const azureBroker = specialize('Azure').components.find(
      c => c.id.toString() === 'broker',
    )!;
    const gcpBroker = specialize('GCP').components.find(
      c => c.id.toString() === 'broker',
    )!;

    // neutral params set via the interface — identical across providers
    expect(azureBroker.parameters.getOptionalFieldByName('azureRegion')).toBe(
      'westeurope',
    );
    expect(
      azureBroker.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toBe('my-rg');
    expect(azureBroker.parameters.getOptionalFieldByName('sku')).toBe(
      'Standard',
    );
    expect(
      azureBroker.parameters.getOptionalFieldByName('azureRegion'),
    ).toEqual(gcpBroker.parameters.getOptionalFieldByName('azureRegion'));
    expect(
      azureBroker.parameters.getOptionalFieldByName('azureResourceGroup'),
    ).toEqual(
      gcpBroker.parameters.getOptionalFieldByName('azureResourceGroup'),
    );
    expect(azureBroker.parameters.getOptionalFieldByName('sku')).toEqual(
      gcpBroker.parameters.getOptionalFieldByName('sku'),
    );

    // declared dependency + link inherited by every offer
    for (const broker of [azureBroker, gcpBroker]) {
      expect(
        broker.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(broker.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('broker');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorBrokerFractal().blueprint;
    const broker = blueprint.components.find(
      c => c.id.toString() === 'broker',
    )!;

    expect(broker.services).toBeDefined();
    // All four offers share the PaaS delivery model → one Service.
    const serviceTypes = broker.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['Messaging.PaaS.Broker']);

    const offerTypes = broker
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'Messaging.PaaS.EventHubNamespace',
      'Messaging.PaaS.PubSub',
      'Messaging.PaaS.Relay',
      'Messaging.PaaS.ServiceBus',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorBrokerFractal();
    expect(() =>
      fractal.toLiveSystem({name: 'acme-broker', environment, provider: 'AWS'}),
    ).toThrow(/No Broker offer/);
  });
});
