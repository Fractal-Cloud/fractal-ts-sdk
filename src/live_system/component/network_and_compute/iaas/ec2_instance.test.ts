import {describe, expect, it} from 'vitest';
import {Ec2Instance} from './ec2_instance';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-ec2',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My EC2',
  amiId: 'ami-0abcdef1234567890',
  instanceType: 't3.micro',
};

describe('Ec2Instance', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = Ec2Instance.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.EC2');
    });

    it('should set provider to AWS', () => {
      const c = Ec2Instance.create(BASE_CONFIG);
      expect(c.provider).toBe('AWS');
    });

    it('should set required amiId and instanceType parameters', () => {
      const c = Ec2Instance.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('amiId')).toBe(
        'ami-0abcdef1234567890'
      );
      expect(c.parameters.getOptionalFieldByName('instanceType')).toBe(
        't3.micro'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = Ec2Instance.create({
        ...BASE_CONFIG,
        keyName: 'my-key',
        userData: 'IyEvYmluL2Jhc2g=',
        iamInstanceProfile: 'arn:aws:iam::123456789012:instance-profile/MyProfile',
        associatePublicIp: true,
      });

      expect(c.parameters.getOptionalFieldByName('keyName')).toBe('my-key');
      expect(c.parameters.getOptionalFieldByName('userData')).toBe(
        'IyEvYmluL2Jhc2g='
      );
      expect(c.parameters.getOptionalFieldByName('iamInstanceProfile')).toBe(
        'arn:aws:iam::123456789012:instance-profile/MyProfile'
      );
      expect(
        c.parameters.getOptionalFieldByName('associatePublicIp')
      ).toBe(true);
    });

    it('should set associatePublicIp when false', () => {
      const c = Ec2Instance.create({...BASE_CONFIG, associatePublicIp: false});
      expect(
        c.parameters.getOptionalFieldByName('associatePublicIp')
      ).toBe(false);
    });

    it('should not set optional params when omitted', () => {
      const c = Ec2Instance.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('keyName')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('userData')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('iamInstanceProfile')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('associatePublicIp')).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName, and description from blueprint', () => {
      const blueprint = VirtualMachine.getBuilder()
        .withId('bp-vm')
        .withVersion(2, 0, 0)
        .withDisplayName('Blueprint VM')
        .withDescription('A VM')
        .build();

      const c = Ec2Instance.satisfy(blueprint)
        .withAmiId('ami-0abc123')
        .withInstanceType('t3.small')
        .build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
      expect(c.description).toBe('A VM');
    });

    it('should allow setting all EC2-specific params after satisfy', () => {
      const {component: blueprint} = VirtualMachine.create({
        id: 'bp-vm-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM B',
      });

      const c = Ec2Instance.satisfy(blueprint)
        .withAmiId('ami-xyz')
        .withInstanceType('m5.large')
        .withKeyName('prod-key')
        .withAssociatePublicIp(false)
        .build();

      expect(c.parameters.getOptionalFieldByName('amiId')).toBe('ami-xyz');
      expect(c.parameters.getOptionalFieldByName('instanceType')).toBe(
        'm5.large'
      );
      expect(c.parameters.getOptionalFieldByName('keyName')).toBe('prod-key');
      expect(
        c.parameters.getOptionalFieldByName('associatePublicIp')
      ).toBe(false);
    });

    it('should carry links (network rules) from the blueprint unchanged', () => {
      const apiServer = VirtualMachine.create({
        id: 'api-server',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API Server',
      });
      const webServer = VirtualMachine.create({
        id: 'web-server',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web Server',
      }).linkToVirtualMachine([{target: apiServer, fromPort: 8080, protocol: 'tcp'}]);

      const c = Ec2Instance.satisfy(webServer.component)
        .withAmiId('ami-abc')
        .withInstanceType('t3.micro')
        .build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('api-server');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080
      );
      expect(c.links[0].parameters.getOptionalFieldByName('protocol')).toBe(
        'tcp'
      );
    });

    it('should carry dependencies from the blueprint unchanged', () => {
      // A VM with a subnet dependency (simulating the auto-wired hierarchy)
      const rawVm = VirtualMachine.getBuilder()
        .withId('dep-vm')
        .withVersion(1, 0, 0)
        .withDisplayName('Dep VM')
        .build();
      // Manually add a dependency as the SubnetComponent would
      const vmWithDep = {
        ...rawVm,
        dependencies: [{id: rawVm.id}],
      };

      const c = Ec2Instance.satisfy(vmWithDep).withAmiId('ami-dep').withInstanceType('t3.nano').build();
      expect(c.dependencies).toHaveLength(1);
    });
  });
});
