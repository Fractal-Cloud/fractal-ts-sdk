import {describe, expect, it} from 'vitest';
import {HetznerNetwork} from './hetzner_network';
import {
  VirtualNetwork,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/virtual_network';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-network',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Network',
  cidrBlock: '10.0.0.0/16',
};

describe('HetznerNetwork', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = HetznerNetwork.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.HetznerNetwork');
    });

    it('should set provider to Hetzner', () => {
      const c = HetznerNetwork.create(BASE_CONFIG);
      expect(c.provider).toBe('Hetzner');
    });

    it('should set cidrBlock parameter', () => {
      const c = HetznerNetwork.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.0.0/16'
      );
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-net',
        version: {major: 2, minor: 1, patch: 3},
        displayName: 'Blueprint Network',
        cidrBlock: '172.16.0.0/12',
      });

      const c = HetznerNetwork.satisfy(vpc).build();

      expect(c.id.toString()).toBe('bp-net');
      expect(c.version.major).toBe(2);
      expect(c.version.minor).toBe(1);
      expect(c.version.patch).toBe(3);
      expect(c.displayName).toBe('Blueprint Network');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-net',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Network',
        cidrBlock: '10.1.0.0/16',
      });

      const c = HetznerNetwork.satisfy(vpc).build();
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.1.0.0/16'
      );
    });

    it('should carry dependencies from blueprint', () => {
      const {vpc} = VirtualNetwork.create({
        id: 'bp-net',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint Network',
      });

      const c = HetznerNetwork.satisfy(vpc).build();
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

      const c = HetznerNetwork.satisfy(sourceVm.component).build();
      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('target-vm');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
    });
  });
});
