import {describe, expect, it} from 'vitest';
import {GcpGlb} from './gcp_glb';
import {VirtualNetwork} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-glb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Global Load Balancer',
};

describe('GcpGlb', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpGlb.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.IaaS.GlobalLoadBalancer'
      );
    });

    it('should set provider to GCP', () => {
      const c = GcpGlb.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set optional vendor-specific parameters', () => {
      const c = GcpGlb.create({
        ...BASE_CONFIG,
        loadBalancingScheme: 'EXTERNAL',
        ipProtocol: 'TCP',
        portRange: '80',
        target: 'target-http-proxy-app',
        ipAddress: 'global-ip-address-name',
      });
      expect(
        c.parameters.getOptionalFieldByName('loadBalancingScheme')
      ).toBe('EXTERNAL');
      expect(
        c.parameters.getOptionalFieldByName('ipProtocol')
      ).toBe('TCP');
      expect(
        c.parameters.getOptionalFieldByName('portRange')
      ).toBe('80');
      expect(
        c.parameters.getOptionalFieldByName('target')
      ).toBe('target-http-proxy-app');
      expect(
        c.parameters.getOptionalFieldByName('ipAddress')
      ).toBe('global-ip-address-name');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-glb',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint GLB',
        cidrBlock: '172.16.0.0/12',
      });

      const c = GcpGlb.satisfy(vpc).build();

      expect(c.id.toString()).toBe('bp-glb');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint GLB');
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-glb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint GLB',
      });

      const c = GcpGlb.satisfy(vpc).build();
      expect(c.dependencies).toHaveLength(0);
    });

    it('should carry links from blueprint', () => {
      const targetVm = VirtualMachine.create({
        id: 'target-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Target VM',
      });
      const sourceVm = VirtualMachine.create({
        id: 'source-vm',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Source VM',
      }).linkToVirtualMachine([{target: targetVm, fromPort: 8080}]);

      const c = GcpGlb.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-glb',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint GLB',
      });

      const c = GcpGlb.satisfy(vpc)
        .withLoadBalancingScheme('EXTERNAL')
        .withIpProtocol('TCP')
        .withPortRange('80')
        .withTarget('target-http-proxy-app')
        .withIpAddress('global-ip-address-name')
        .build();

      expect(c.parameters.getOptionalFieldByName('loadBalancingScheme')).toBe(
        'EXTERNAL'
      );
      expect(c.parameters.getOptionalFieldByName('ipProtocol')).toBe('TCP');
      expect(c.parameters.getOptionalFieldByName('portRange')).toBe('80');
      expect(c.parameters.getOptionalFieldByName('target')).toBe(
        'target-http-proxy-app'
      );
      expect(c.parameters.getOptionalFieldByName('ipAddress')).toBe(
        'global-ip-address-name'
      );
    });
  });
});
