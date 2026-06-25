/**
 * apimanagement_apigateway_paas.test.ts
 *
 * M5 migration proof for the APIManagement "APIGateway" capability (PaaS offers)
 * under the Fractal + Interface model. Mirrors
 * samples/bigdata_distributeddataprocessing.test.ts and samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose ApiGateway abstract component
 *     carries the candidate Offers (AwsCloudFront/AWS, AzureApiManagement/Azure,
 *     GcpApiGateway/GCP).
 *   - A dev consumes through the Interface only; this capability has no
 *     vendor-neutral knobs (every API gateway setting is vendor-specific), so the
 *     Interface declares no neutral ops.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the declared
 *     dependencies and links flow through identically.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No APIGateway offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ApiGateway} from '../fractal/component/api_management/paas/api_gateway';
import {AwsCloudFront} from '../live_system/component/api_management/paas/aws_cloudfront';
import {AzureApiManagement} from '../live_system/component/api_management/paas/azure_api_management';
import {GcpApiGateway} from '../live_system/component/api_management/paas/gcp_api_gateway';
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
      .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
      .withName(PascalCaseString.getBuilder().withValue('LinkedThing').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorGatewayFractal() {
  return createFractal({
    id: 'api-gateway',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed API gateway',
    boundedContextId,
    blueprint: bp => ({
      gateway: bp.add(
        ApiGateway.create({
          id: 'api-gateway',
          displayName: 'API Gateway',
          offers: [AwsCloudFront, AzureApiManagement, GcpApiGateway],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    // ApiGateway has no vendor-neutral knobs — the Interface exposes no neutral
    // ops.
    operations: () => ({}),
  });
}

// ── Dev team: select a provider; no neutral specialization needed. ───────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorGatewayFractal();
  return fractal.toLiveSystem({name: 'acme-gateway', environment, provider});
}

describe('ApiGateway (PaaS) Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'APIManagement.PaaS.CloudFront'],
      ['Azure', 'APIManagement.PaaS.ApiManagement'],
      ['GCP', 'APIManagement.PaaS.ApiGateway'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const gateway = ls.components.find(
        c => c.id.toString() === 'api-gateway',
      )!;
      expect(gateway).toBeDefined();
      expect(gateway.type.toString()).toBe(expectedType);
      expect(gateway.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows declared deps and links to whichever offer the provider selects', () => {
    const awsGateway = specialize('AWS').components.find(
      c => c.id.toString() === 'api-gateway',
    )!;
    const azureGateway = specialize('Azure').components.find(
      c => c.id.toString() === 'api-gateway',
    )!;
    const gcpGateway = specialize('GCP').components.find(
      c => c.id.toString() === 'api-gateway',
    )!;

    for (const gateway of [awsGateway, azureGateway, gcpGateway]) {
      expect(
        gateway.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(gateway.links.some(l => l.id.toString() === 'linked-thing')).toBe(
        true,
      );
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('api-gateway');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorGatewayFractal().blueprint;
    const gateway = blueprint.components.find(
      c => c.id.toString() === 'api-gateway',
    )!;

    expect(gateway.services).toBeDefined();
    // All three offers share the PaaS delivery model → one Service.
    const serviceTypes = gateway.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['APIManagement.PaaS.APIGateway']);

    const offerTypes = gateway
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'APIManagement.PaaS.ApiGateway',
      'APIManagement.PaaS.ApiManagement',
      'APIManagement.PaaS.CloudFront',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorGatewayFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-gateway',
        environment,
        provider: 'Hetzner',
      }),
    ).toThrow(/No APIGateway offer/);
  });
});
