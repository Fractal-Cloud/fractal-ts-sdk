import {describe, expect, it} from 'vitest';
import {AwsCloudFront} from './aws_cloudfront';
import {PaaSApiGateway} from '../../../../fractal/component/api_management/paas/api_gateway';

const BASE_CONFIG = {
  id: 'my-cdn',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My CloudFront',
};

describe('AwsCloudFront', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsCloudFront.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('APIManagement.PaaS.CloudFront');
    });

    it('should set provider to AWS', () => {
      const c = AwsCloudFront.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set vendor-specific parameters', () => {
      const c = AwsCloudFront.create({
        ...BASE_CONFIG,
        awsRegion: 'us-east-1',
        apiKeySource: 'HEADER',
        binaryMediaTypes: ['image/png', 'application/octet-stream'],
        minimumCompressionSize: 1024,
        disableExecuteApiEndpoint: true,
      });
      expect(c.parameters.getOptionalFieldByName('awsRegion')).toBe(
        'us-east-1'
      );
      expect(c.parameters.getOptionalFieldByName('apiKeySource')).toBe(
        'HEADER'
      );
      expect(
        c.parameters.getOptionalFieldByName('binaryMediaTypes')
      ).toEqual(['image/png', 'application/octet-stream']);
      expect(
        c.parameters.getOptionalFieldByName('minimumCompressionSize')
      ).toBe(1024);
      expect(
        c.parameters.getOptionalFieldByName('disableExecuteApiEndpoint')
      ).toBe(true);
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-cdn',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint CDN',
      });

      const c = AwsCloudFront.satisfy(bp.component).build();

      expect(c.id.toString()).toBe('bp-cdn');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint CDN');
    });

    it('should carry dependencies and links from blueprint', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-cdn',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint CDN',
      });

      const c = AwsCloudFront.satisfy(bp.component).build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });

    it('should allow setting vendor-specific params via satisfied builder', () => {
      const bp = PaaSApiGateway.create({
        id: 'bp-cdn',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint CDN',
      });

      const c = AwsCloudFront.satisfy(bp.component)
        .withAwsRegion('eu-west-1')
        .withApiKeySource('AUTHORIZER')
        .withBinaryMediaTypes(['image/jpeg'])
        .withMinimumCompressionSize(512)
        .withDisableExecuteApiEndpoint(false)
        .build();

      expect(c.parameters.getOptionalFieldByName('awsRegion')).toBe(
        'eu-west-1'
      );
      expect(c.parameters.getOptionalFieldByName('apiKeySource')).toBe(
        'AUTHORIZER'
      );
      expect(
        c.parameters.getOptionalFieldByName('binaryMediaTypes')
      ).toEqual(['image/jpeg']);
      expect(
        c.parameters.getOptionalFieldByName('minimumCompressionSize')
      ).toBe(512);
      expect(
        c.parameters.getOptionalFieldByName('disableExecuteApiEndpoint')
      ).toBe(false);
    });
  });
});
