/**
 * basic_api_management.test.ts
 *
 * Fractal + Interface proof for the migrated APIManagement "ApiGateway"
 * capability. Mirrors samples/messaging_broker.test.ts and
 * samples/identity_fractal.test.ts:
 *
 *   - An infra team authors ONE Fractal whose abstract `ApiGateway` component
 *     carries the candidate Offers (AwsCloudFront/AWS, AzureApiManagement/Azure,
 *     GcpApiGateway/GCP).
 *   - A dev specializes through the Interface only, never naming a vendor offer.
 *     ApiGateway has no vendor-neutral knobs (region/sku/publisher/apiId are all
 *     vendor-specific), so the Interface exposes per-vendor setters; whichever
 *     ones apply to the selected provider flow into the chosen offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No APIGateway offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ApiGateway} from '../fractal/component/api_management/paas/api_gateway';
import {
  AwsCloudFront,
  AWS_REGION_PARAM,
  API_KEY_SOURCE_PARAM,
} from '../live_system/component/api_management/paas/aws_cloudfront';
import {
  AzureApiManagement,
  AZURE_REGION_PARAM,
  PUBLISHER_NAME_PARAM,
  PUBLISHER_EMAIL_PARAM,
  SKU_NAME_PARAM,
} from '../live_system/component/api_management/paas/azure_api_management';
import {
  GcpApiGateway,
  REGION_PARAM,
  API_ID_PARAM,
} from '../live_system/component/api_management/paas/gcp_api_gateway';
import {LiveSystemComponent} from '../live_system/component';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';

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

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorApiGatewayFractal() {
  return createFractal({
    id: 'api-management',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed API gateway',
    boundedContextId,
    blueprint: bp => ({
      gateway: bp.add(
        ApiGateway.create({
          id: 'api-gateway',
          displayName: 'API Gateway',
          offers: [AwsCloudFront, AzureApiManagement, GcpApiGateway],
        }),
      ),
    }),
    operations: bp => ({
      // AWS-specific
      withAwsRegion: (region: string) =>
        bp.gateway.set(AWS_REGION_PARAM, region),
      withApiKeySource: (source: string) =>
        bp.gateway.set(API_KEY_SOURCE_PARAM, source),
      // Azure-specific
      withAzureRegion: (region: string) =>
        bp.gateway.set(AZURE_REGION_PARAM, region),
      withPublisherName: (name: string) =>
        bp.gateway.set(PUBLISHER_NAME_PARAM, name),
      withPublisherEmail: (email: string) =>
        bp.gateway.set(PUBLISHER_EMAIL_PARAM, email),
      withSkuName: (sku: string) => bp.gateway.set(SKU_NAME_PARAM, sku),
      // GCP-specific
      withGcpRegion: (region: string) => bp.gateway.set(REGION_PARAM, region),
      withApiId: (apiId: string) => bp.gateway.set(API_ID_PARAM, apiId),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorApiGatewayFractal();
  fractal.operations
    .withAwsRegion('us-east-1')
    .withApiKeySource('HEADER')
    .withAzureRegion('westeurope')
    .withPublisherName('Platform Team')
    .withPublisherEmail('platform@example.com')
    .withSkuName('Developer_1')
    .withGcpRegion('europe-west1')
    .withApiId('my-api');
  return fractal.toLiveSystem({name: 'acme-gateway', environment, provider});
}

describe('ApiGateway Fractal — provider-driven offer swap', () => {
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
      expect(gateway.displayName).toBe('API Gateway');
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows the vendor-specific params through to whichever offer the provider selects', () => {
    const awsGateway = specialize('AWS').components.find(
      c => c.id.toString() === 'api-gateway',
    )!;
    const azureGateway = specialize('Azure').components.find(
      c => c.id.toString() === 'api-gateway',
    )!;
    const gcpGateway = specialize('GCP').components.find(
      c => c.id.toString() === 'api-gateway',
    )!;

    expect(awsGateway.parameters.getOptionalFieldByName(AWS_REGION_PARAM)).toBe(
      'us-east-1',
    );
    expect(
      awsGateway.parameters.getOptionalFieldByName(API_KEY_SOURCE_PARAM),
    ).toBe('HEADER');

    expect(
      azureGateway.parameters.getOptionalFieldByName(AZURE_REGION_PARAM),
    ).toBe('westeurope');
    expect(
      azureGateway.parameters.getOptionalFieldByName(PUBLISHER_NAME_PARAM),
    ).toBe('Platform Team');
    expect(
      azureGateway.parameters.getOptionalFieldByName(PUBLISHER_EMAIL_PARAM),
    ).toBe('platform@example.com');
    expect(azureGateway.parameters.getOptionalFieldByName(SKU_NAME_PARAM)).toBe(
      'Developer_1',
    );

    expect(gcpGateway.parameters.getOptionalFieldByName(REGION_PARAM)).toBe(
      'europe-west1',
    );
    expect(gcpGateway.parameters.getOptionalFieldByName(API_ID_PARAM)).toBe(
      'my-api',
    );
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('Azure');
    expect(typeof ls.deploy).toBe('function');
    expect(typeof ls.destroy).toBe('function');
    expect(ls.fractalId.toString()).toContain('api-management');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('Azure');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorApiGatewayFractal().blueprint;
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
    const fractal = authorApiGatewayFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-gateway',
        environment,
        provider: 'OCI',
      }),
    ).toThrow(/No APIGateway offer/);
  });
});
