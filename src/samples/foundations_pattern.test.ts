/**
 * foundations_pattern.test.ts
 *
 * M0 reference proof for the Fractal + Interface migration. Exercises the GENERAL
 * case the per-domain milestones rely on — a single abstract component, satisfied
 * by two offers, where:
 *   - the dev specializes through the Interface only (no offer named),
 *   - the chosen Provider selects the offer,
 *   - the offer inherits the abstract component's vendor-neutral params + the
 *     dependencies + links it declares,
 *   - an offer may emit vendor-specific SUB-COMPONENTS (live-system only),
 *   - `toLiveSystem` returns a real, validated LiveSystem (deploy/fractalId/env),
 *   - the authored Blueprint serializes each candidate offer onto a Service.
 *
 * Built on synthetic offers (Storage domain) so M0 stays free of cross-domain
 * entanglement; the real components are migrated in M1+ following this pattern.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {createAbstractComponent} from '../fractal/component/abstract_component';
import {Offer, instantiateFromNeutral} from '../fractal/offer';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../fractal/component/type';
import {getLiveSystemComponentBuilder} from '../live_system/component/entity';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../values/service_delivery_model';
import {PascalCaseString} from '../values/pascal_case_string';
import {getParametersInstance} from '../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../component/id';
import {KebabCaseString} from '../values/kebab_case_string';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getLinkBuilder} from '../component/link';
import {getComponentTypeBuilder} from '../component/type';

// ── fixtures ─────────────────────────────────────────────────────────────────

function kebab(value: string): KebabCaseString {
  return KebabCaseString.getBuilder().withValue(value).build();
}

function offerType(
  dm: ServiceDeliveryModel,
  name: string,
): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(dm)
    .withName(PascalCaseString.getBuilder().withValue(name).build())
    .build();
}

function subId(parent: ComponentId): ComponentId {
  return getComponentIdBuilder()
    .withValue(kebab(`${parent.toString()}-sub`))
    .build();
}

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
      .withInfrastructureDomain(InfrastructureDomain.Storage)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── synthetic offers ─────────────────────────────────────────────────────────

// AWS offer: emits a vendor-specific sub-component and adds a live-system-only
// dependency from the primary onto that sub-component.
const awsOffer: Offer = {
  type: offerType(ServiceDeliveryModel.PaaS, 'StoreAws'),
  provider: 'AWS',
  instantiate: ctx => {
    const subComponentId = subId(ctx.id);
    const sub = getLiveSystemComponentBuilder()
      .withType(offerType(ServiceDeliveryModel.PaaS, 'StoreAwsSub'))
      .withId(subComponentId)
      .withVersion(ctx.version)
      .withDisplayName('Store AWS sub-component')
      .withDescription('sub')
      .withProvider('AWS')
      .withParameters(getParametersInstance())
      .build();

    const primary = instantiateFromNeutral(
      {...ctx, dependencies: [...ctx.dependencies, {id: subComponentId}]},
      offerType(ServiceDeliveryModel.PaaS, 'StoreAws'),
      'AWS',
    );
    return [primary, sub];
  },
};

// CaaS offer: no sub-component.
const caasOffer: Offer = {
  type: offerType(ServiceDeliveryModel.CaaS, 'StoreCaas'),
  provider: 'CaaS',
  instantiate: ctx => [
    instantiateFromNeutral(
      ctx,
      offerType(ServiceDeliveryModel.CaaS, 'StoreCaas'),
      'CaaS',
    ),
  ],
};

// ── authored fractal ─────────────────────────────────────────────────────────

function authorStorageFractal() {
  return createFractal({
    id: 'storage-fractal',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed storage',
    boundedContextId,
    blueprint: bp => ({
      store: bp.add(
        createAbstractComponent({
          id: 'store',
          displayName: 'Store',
          domain: InfrastructureDomain.Storage,
          serviceName: 'ObjectStore',
          offers: [awsOffer, caasOffer],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withSize: (size: string) => bp.store.set('size', size),
    }),
  });
}

function specialize(provider: 'AWS' | 'CaaS') {
  const fractal = authorStorageFractal();
  fractal.operations.withSize('large');
  return fractal.toLiveSystem({name: 'acme-store', environment, provider});
}

describe('M0 foundations — generalized offer model', () => {
  it('selects the offer by provider and emits its sub-components', () => {
    const aws = specialize('AWS');
    const caas = specialize('CaaS');

    const awsPrimary = aws.components.find(c => c.id.toString() === 'store')!;
    const awsSub = aws.components.find(c => c.id.toString() === 'store-sub');
    const caasPrimary = caas.components.find(c => c.id.toString() === 'store')!;
    const caasSub = caas.components.find(c => c.id.toString() === 'store-sub');

    expect(awsPrimary.type.toString()).toBe('Storage.PaaS.StoreAws');
    expect(awsPrimary.provider).toBe('AWS');
    expect(awsSub).toBeDefined(); // AWS offer emitted its sub-component
    expect(caasPrimary.type.toString()).toBe('Storage.CaaS.StoreCaas');
    expect(caasSub).toBeUndefined(); // CaaS offer has none
  });

  it('inherits neutral params, declared dependencies and links into each offer', () => {
    const awsPrimary = specialize('AWS').components.find(
      c => c.id.toString() === 'store',
    )!;
    const caasPrimary = specialize('CaaS').components.find(
      c => c.id.toString() === 'store',
    )!;

    // neutral param set via the interface
    expect(awsPrimary.parameters.getOptionalFieldByName('size')).toBe('large');
    expect(awsPrimary.parameters.getOptionalFieldByName('size')).toEqual(
      caasPrimary.parameters.getOptionalFieldByName('size'),
    );

    // declared dependency inherited by both offers
    expect(
      awsPrimary.dependencies.some(
        d => d.id.toString() === 'some-prerequisite',
      ),
    ).toBe(true);
    expect(
      caasPrimary.dependencies.some(
        d => d.id.toString() === 'some-prerequisite',
      ),
    ).toBe(true);

    // AWS additionally wires the sub-component dependency
    expect(
      awsPrimary.dependencies.some(d => d.id.toString() === 'store-sub'),
    ).toBe(true);

    // declared link inherited by both offers
    expect(awsPrimary.links.some(l => l.id.toString() === 'linked-thing')).toBe(
      true,
    );
    expect(
      caasPrimary.links.some(l => l.id.toString() === 'linked-thing'),
    ).toBe(true);
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('storage-fractal');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });

  it('serializes candidate offers onto the Blueprint component Services', () => {
    const blueprint = authorStorageFractal().blueprint;
    const store = blueprint.components.find(c => c.id.toString() === 'store')!;

    expect(store.services).toBeDefined();
    const serviceTypes = store.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual([
      'Storage.CaaS.ObjectStore',
      'Storage.PaaS.ObjectStore',
    ]);

    const allOffers = store.services!.flatMap(s => s.offers);
    expect(allOffers.map(o => o.type.toString()).sort()).toEqual([
      'Storage.CaaS.StoreCaas',
      'Storage.PaaS.StoreAws',
    ]);
  });
});
