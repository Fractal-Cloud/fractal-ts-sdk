import {describe, expect, it} from 'vitest';
import {AwsLb} from './aws_lb';
import {VirtualNetwork} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-lb',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Load Balancer',
};

describe('AwsLb', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsLb.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.LoadBalancer');
    });

    it('should set provider to AWS', () => {
      const c = AwsLb.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set optional vendor-specific parameters', () => {
      const c = AwsLb.create({
        ...BASE_CONFIG,
        loadBalancerType: 'application',
        internal: true,
        enableDeletionProtection: false,
        idleTimeout: 60,
        ipAddressType: 'ipv4',
      });
      expect(
        c.parameters.getOptionalFieldByName('loadBalancerType')
      ).toBe('application');
      expect(
        c.parameters.getOptionalFieldByName('internal')
      ).toBe(true);
      expect(
        c.parameters.getOptionalFieldByName('enableDeletionProtection')
      ).toBe(false);
      expect(
        c.parameters.getOptionalFieldByName('idleTimeout')
      ).toBe(60);
      expect(
        c.parameters.getOptionalFieldByName('ipAddressType')
      ).toBe('ipv4');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vpc',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint VPC',
        cidrBlock: '172.16.0.0/12',
      });

      const c = AwsLb.satisfy(vpc).build();

      expect(c.id.toString()).toBe('bp-vpc');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint VPC');
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VPC',
      });

      const c = AwsLb.satisfy(vpc).build();
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

      const c = AwsLb.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VPC',
      });

      const c = AwsLb.satisfy(vpc)
        .withLoadBalancerType('network')
        .withInternal(false)
        .withEnableDeletionProtection(true)
        .withIdleTimeout(120)
        .withIpAddressType('dualstack')
        .build();

      expect(
        c.parameters.getOptionalFieldByName('loadBalancerType')
      ).toBe('network');
      expect(
        c.parameters.getOptionalFieldByName('internal')
      ).toBe(false);
      expect(
        c.parameters.getOptionalFieldByName('enableDeletionProtection')
      ).toBe(true);
      expect(
        c.parameters.getOptionalFieldByName('idleTimeout')
      ).toBe(120);
      expect(
        c.parameters.getOptionalFieldByName('ipAddressType')
      ).toBe('dualstack');
    });
  });
});
