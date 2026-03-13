import {describe, expect, it} from 'vitest';
import {LoadBalancer} from './load_balancer';

const BASE_CONFIG = {
  id: 'my-lb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My LB',
};

describe('LoadBalancer (blueprint)', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const {component} = LoadBalancer.create(BASE_CONFIG);
      expect(component.type.toString()).toBe('NetworkAndCompute.IaaS.LoadBalancer');
    });

    it('should set id, version, and displayName', () => {
      const {component} = LoadBalancer.create(BASE_CONFIG);
      expect(component.id.toString()).toBe('my-lb');
      expect(component.version.major).toBe(1);
      expect(component.displayName).toBe('My LB');
    });

    it('should set description when provided', () => {
      const {component} = LoadBalancer.create({...BASE_CONFIG, description: 'App load balancer'});
      expect(component.description).toBe('App load balancer');
    });

    it('should not set description when omitted', () => {
      const {component} = LoadBalancer.create(BASE_CONFIG);
      expect(component.description).toBeFalsy();
    });

    it('should have no dependencies', () => {
      const {component} = LoadBalancer.create(BASE_CONFIG);
      expect(component.dependencies).toHaveLength(0);
    });

    it('should have no links', () => {
      const {component} = LoadBalancer.create(BASE_CONFIG);
      expect(component.links).toHaveLength(0);
    });
  });

  describe('getBuilder()', () => {
    it('should build a valid component', () => {
      const c = LoadBalancer.getBuilder()
        .withId('lb-a')
        .withVersion(2, 0, 0)
        .withDisplayName('LB A')
        .build();

      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.LoadBalancer');
      expect(c.id.toString()).toBe('lb-a');
      expect(c.dependencies).toHaveLength(0);
    });
  });
});
