/**
 * basic_api_management.test.ts
 *
 * Integration tests for the basic_api_management sample pattern.
 * Verifies the blueprint builds correctly and each provider's live system
 * maps components with the right types, dependencies, and parameters.
 */

import {describe, expect, it} from 'vitest';
import {PaaSApiGateway} from '../fractal/component/api_management/paas/api_gateway';
import {AwsCloudFront} from '../live_system/component/api_management/paas/aws_cloudfront';
import {AzureApiManagement} from '../live_system/component/api_management/paas/azure_api_management';
import {GcpApiGateway} from '../live_system/component/api_management/paas/gcp_api_gateway';

// ── Blueprint fixtures ──────────────────────────────────────────────────────

const gateway = PaaSApiGateway.create({
  id: 'api-gateway',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'API Gateway',
});

// ── Blueprint tests ─────────────────────────────────────────────────────────

describe('basic_api_management blueprint', () => {
  it('should create PaaSApiGateway with correct type', () => {
    expect(gateway.component.type.toString()).toBe(
      'APIManagement.PaaS.APIGateway',
    );
    expect(gateway.component.id.toString()).toBe('api-gateway');
    expect(gateway.component.displayName).toBe('API Gateway');
  });

  it('should include gateway in components array', () => {
    expect(gateway.components).toHaveLength(1);
    expect(gateway.components[0]).toBe(gateway.component);
  });
});

// ── AWS live system tests ─────────────────────────────────────────────────

describe('basic_api_management AWS live system', () => {
  it('should satisfy PaaSApiGateway with AwsCloudFront', () => {
    const awsGateway = AwsCloudFront.satisfy(gateway.component)
      .withAwsRegion('us-east-1')
      .withApiKeySource('HEADER')
      .build();

    expect(awsGateway.type.toString()).toBe('APIManagement.PaaS.CloudFront');
    expect(awsGateway.provider).toBe('AWS');
    expect(awsGateway.id.toString()).toBe('api-gateway');
    expect(awsGateway.displayName).toBe('API Gateway');
    expect(awsGateway.parameters.getOptionalFieldByName('awsRegion')).toBe(
      'us-east-1',
    );
    expect(awsGateway.parameters.getOptionalFieldByName('apiKeySource')).toBe(
      'HEADER',
    );
  });
});

// ── Azure live system tests ─────────────────────────────────────────────────

describe('basic_api_management Azure live system', () => {
  it('should satisfy PaaSApiGateway with AzureApiManagement', () => {
    const azureGateway = AzureApiManagement.satisfy(gateway.component)
      .withAzureRegion('westeurope')
      .withPublisherName('Platform Team')
      .withPublisherEmail('platform@example.com')
      .withSkuName('Developer_1')
      .build();

    expect(azureGateway.type.toString()).toBe(
      'APIManagement.PaaS.ApiManagement',
    );
    expect(azureGateway.provider).toBe('Azure');
    expect(azureGateway.id.toString()).toBe('api-gateway');
    expect(azureGateway.displayName).toBe('API Gateway');
    expect(
      azureGateway.parameters.getOptionalFieldByName('azureRegion'),
    ).toBe('westeurope');
    expect(
      azureGateway.parameters.getOptionalFieldByName('publisherName'),
    ).toBe('Platform Team');
    expect(
      azureGateway.parameters.getOptionalFieldByName('publisherEmail'),
    ).toBe('platform@example.com');
    expect(azureGateway.parameters.getOptionalFieldByName('skuName')).toBe(
      'Developer_1',
    );
  });
});

// ── GCP live system tests ───────────────────────────────────────────────────

describe('basic_api_management GCP live system', () => {
  it('should satisfy PaaSApiGateway with GcpApiGateway', () => {
    const gcpGateway = GcpApiGateway.satisfy(gateway.component)
      .withRegion('europe-west1')
      .withApiId('my-api')
      .build();

    expect(gcpGateway.type.toString()).toBe('APIManagement.PaaS.ApiGateway');
    expect(gcpGateway.provider).toBe('GCP');
    expect(gcpGateway.id.toString()).toBe('api-gateway');
    expect(gcpGateway.displayName).toBe('API Gateway');
    expect(gcpGateway.parameters.getOptionalFieldByName('region')).toBe(
      'europe-west1',
    );
    expect(gcpGateway.parameters.getOptionalFieldByName('apiId')).toBe(
      'my-api',
    );
  });
});
