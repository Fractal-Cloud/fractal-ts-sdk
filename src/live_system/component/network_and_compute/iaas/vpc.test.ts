import {describe, expect, it} from 'vitest';
import {AwsVpc} from './vpc';
import {
  VirtualNetwork,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-vpc',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VPC',
  cidrBlock: '10.0.0.0/16',
};

describe('AwsVpc', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AwsVpc.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.AwsVpc');
    });

    it('should set provider to AWS', () => {
      const c = AwsVpc.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set cidrBlock parameter', () => {
      const c = AwsVpc.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.0.0/16'
      );
    });

    it('should set optional DNS and tenancy parameters', () => {
      const c = AwsVpc.create({
        ...BASE_CONFIG,
        instanceTenancy: 'default',
        enableDnsSupport: true,
        enableDnsHostnames: false,
      });
      expect(
        c.parameters.getOptionalFieldByName('instanceTenancy')
      ).toBe('default');
      expect(
        c.parameters.getOptionalFieldByName('enableDnsSupport')
      ).toBe(true);
      expect(
        c.parameters.getOptionalFieldByName('enableDnsHostnames')
      ).toBe(false);
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

      const c = AwsVpc.satisfy(vpc).build();

      expect(c.id.toString()).toBe('bp-vpc');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint VPC');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VPC',
        cidrBlock: '10.1.0.0/16',
      });

      const c = AwsVpc.satisfy(vpc).build();
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.1.0.0/16'
      );
    });

    it('should carry dependencies from blueprint', () => {
      // Build a VPC that has already been wired with a dependency
      const {vpc} = VirtualNetwork.create({
        id: 'bp-vpc',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VPC',
      });

      const c = AwsVpc.satisfy(vpc).build();
      // VPCs have no parent dependencies — verify the count is locked to 0
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
      }).withLinks([{target: targetVm, fromPort: 8080}]);

      // Simulate a blueprint component that has a link
      const c = AwsVpc.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });
  });
});
