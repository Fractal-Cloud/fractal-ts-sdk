import {describe, expect, it} from 'vitest';
import {PaaSApiGateway} from './api_gateway';

const BASE_CONFIG = {
  id: 'my-gateway',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My API Gateway',
};

describe('PaaSApiGateway (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = PaaSApiGateway.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('APIManagement.PaaS.APIGateway');
    });

    it('should set id, version, and displayName', () => {
      const {component} = PaaSApiGateway.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-gateway');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My API Gateway');
    });

    it('should set description when provided', () => {
      const {component} = PaaSApiGateway.create({
        ...BASE_CONFIG,
        description: 'PaaS API Gateway',
      });
      expect(component.description).toBe('PaaS API Gateway');
    });

    it('should not set description when omitted', () => {
      const {component} = PaaSApiGateway.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = PaaSApiGateway.getBuilder()
        .withId('gw-a')
        .withVersion(2, 0, 0)
        .withDisplayName('GW A')
        .build();

      expect(c.type.toString()).toBe('APIManagement.PaaS.APIGateway');
      expect(c.id.toString()).toBe('gw-a');
    });
  });
});
