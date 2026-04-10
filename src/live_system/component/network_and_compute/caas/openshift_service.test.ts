import {describe, expect, it} from 'vitest';
import {OpenshiftService} from './openshift_service';
import {SecurityGroup} from '../../../../fractal/component/network_and_compute/iaas/security_group';

const BASE_CONFIG = {
  id: 'my-svc',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Service',
  name: 'web-service',
};

describe('OpenshiftService', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OpenshiftService.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.CaaS.OpenshiftService'
      );
    });

    it('should set provider to RedHat', () => {
      const c = OpenshiftService.create(BASE_CONFIG);
      expect(c.provider).toBe('RedHat');
    });

    it('should set required name parameter', () => {
      const c = OpenshiftService.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('name')).toBe('web-service');
    });

    it('should set optional parameters when provided', () => {
      const c = OpenshiftService.create({
        ...BASE_CONFIG,
        port: 443,
        targetPort: 8080,
        protocol: 'TCP',
        serviceType: 'LoadBalancer',
        createRoute: true,
        routeHostname: 'app.example.com',
        routeTlsTermination: 'edge',
      });
      expect(c.parameters.getOptionalFieldByName('port')).toBe(443);
      expect(c.parameters.getOptionalFieldByName('targetPort')).toBe(8080);
      expect(c.parameters.getOptionalFieldByName('protocol')).toBe('TCP');
      expect(c.parameters.getOptionalFieldByName('serviceType')).toBe(
        'LoadBalancer'
      );
      expect(c.parameters.getOptionalFieldByName('createRoute')).toBe(true);
      expect(c.parameters.getOptionalFieldByName('routeHostname')).toBe(
        'app.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('routeTlsTermination')).toBe(
        'edge'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = OpenshiftService.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('port')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('targetPort')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('serviceType')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName, and description from blueprint', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'Blueprint SG',
        description: 'A security group',
      });

      const c = OpenshiftService.satisfy(blueprint)
        .withName('web-svc')
        .build();

      expect(c.id.toString()).toBe('bp-sg');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint SG');
      expect(c.description).toBe('A security group');
    });

    it('should allow setting all vendor-specific params after satisfy', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint SG B',
      });

      const c = OpenshiftService.satisfy(blueprint)
        .withName('api-svc')
        .withPort(8443)
        .withTargetPort(8080)
        .withProtocol('TCP')
        .withServiceType('ClusterIP')
        .withCreateRoute(false)
        .withRouteHostname('api.example.com')
        .withRouteTlsTermination('passthrough')
        .build();

      expect(c.parameters.getOptionalFieldByName('name')).toBe('api-svc');
      expect(c.parameters.getOptionalFieldByName('port')).toBe(8443);
      expect(c.parameters.getOptionalFieldByName('targetPort')).toBe(8080);
      expect(c.parameters.getOptionalFieldByName('protocol')).toBe('TCP');
      expect(c.parameters.getOptionalFieldByName('serviceType')).toBe(
        'ClusterIP'
      );
      expect(c.parameters.getOptionalFieldByName('createRoute')).toBe(false);
      expect(c.parameters.getOptionalFieldByName('routeHostname')).toBe(
        'api.example.com'
      );
      expect(c.parameters.getOptionalFieldByName('routeTlsTermination')).toBe(
        'passthrough'
      );
    });

    it('should carry dependencies and links from blueprint', () => {
      const blueprint = SecurityGroup.create({
        id: 'bp-sg-deps',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint SG Deps',
      });

      const c = OpenshiftService.satisfy(blueprint).withName('svc').build();
      expect(c.dependencies).toHaveLength(0);
      expect(c.links).toHaveLength(0);
    });
  });
});
