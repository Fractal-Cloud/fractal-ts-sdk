import {describe, expect, it} from 'vitest';
import {OpenshiftVm} from './openshift_vm';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-vm',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My VM',
  name: 'test-vm',
  image: 'registry.example.com/rhel:9',
};

describe('OpenshiftVm', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OpenshiftVm.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.IaaS.OpenshiftVirtualMachine'
      );
    });

    it('should set provider to RedHat', () => {
      const c = OpenshiftVm.create(BASE_CONFIG);
      expect(c.provider).toBe('RedHat');
    });

    it('should set required name and image parameters', () => {
      const c = OpenshiftVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('name')).toBe('test-vm');
      expect(c.parameters.getOptionalFieldByName('image')).toBe(
        'registry.example.com/rhel:9'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = OpenshiftVm.create({
        ...BASE_CONFIG,
        namespace: 'vms',
        cpuCores: 4,
        memorySizeGi: '8Gi',
        diskSizeGi: '50Gi',
        storageClassName: 'ocs-storagecluster-ceph-rbd',
        networkName: 'tenant-network',
        cloudInitUserData: 'IyEvYmluL2Jhc2g=',
        sshPublicKey: 'ssh-rsa AAAA...',
        runStrategy: 'Always',
      });
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe('vms');
      expect(c.parameters.getOptionalFieldByName('cpuCores')).toBe(4);
      expect(c.parameters.getOptionalFieldByName('memorySizeGi')).toBe('8Gi');
      expect(c.parameters.getOptionalFieldByName('diskSizeGi')).toBe('50Gi');
      expect(c.parameters.getOptionalFieldByName('storageClassName')).toBe(
        'ocs-storagecluster-ceph-rbd'
      );
      expect(c.parameters.getOptionalFieldByName('networkName')).toBe(
        'tenant-network'
      );
      expect(c.parameters.getOptionalFieldByName('cloudInitUserData')).toBe(
        'IyEvYmluL2Jhc2g='
      );
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-rsa AAAA...'
      );
      expect(c.parameters.getOptionalFieldByName('runStrategy')).toBe(
        'Always'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = OpenshiftVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('namespace')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('cpuCores')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('memorySizeGi')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('runStrategy')).toBeNull();
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

      const c = OpenshiftVm.satisfy(blueprint)
        .withName('test-vm')
        .withImage('rhel:9')
        .build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
      expect(c.description).toBe('A VM');
    });

    it('should allow setting all vendor-specific params after satisfy', () => {
      const {component: blueprint} = VirtualMachine.create({
        id: 'bp-vm-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM B',
      });

      const c = OpenshiftVm.satisfy(blueprint)
        .withName('prod-vm')
        .withImage('fedora:39')
        .withNamespace('production')
        .withCpuCores(8)
        .withMemorySizeGi('16Gi')
        .withDiskSizeGi('100Gi')
        .withStorageClassName('gp3')
        .withNetworkName('prod-net')
        .withCloudInitUserData('IyEvYmluL2Jhc2g=')
        .withSshPublicKey('ssh-ed25519 AAAA...')
        .withRunStrategy('RerunOnFailure')
        .build();

      expect(c.parameters.getOptionalFieldByName('name')).toBe('prod-vm');
      expect(c.parameters.getOptionalFieldByName('image')).toBe('fedora:39');
      expect(c.parameters.getOptionalFieldByName('namespace')).toBe(
        'production'
      );
      expect(c.parameters.getOptionalFieldByName('cpuCores')).toBe(8);
      expect(c.parameters.getOptionalFieldByName('memorySizeGi')).toBe(
        '16Gi'
      );
      expect(c.parameters.getOptionalFieldByName('diskSizeGi')).toBe('100Gi');
      expect(c.parameters.getOptionalFieldByName('storageClassName')).toBe(
        'gp3'
      );
      expect(c.parameters.getOptionalFieldByName('networkName')).toBe(
        'prod-net'
      );
      expect(c.parameters.getOptionalFieldByName('cloudInitUserData')).toBe(
        'IyEvYmluL2Jhc2g='
      );
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-ed25519 AAAA...'
      );
      expect(c.parameters.getOptionalFieldByName('runStrategy')).toBe(
        'RerunOnFailure'
      );
    });

    it('should carry links from the blueprint unchanged', () => {
      const apiServer = VirtualMachine.create({
        id: 'api-server',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API Server',
      });
      const webServer = VirtualMachine.create({
        id: 'web-server',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web Server',
      }).linkToVirtualMachine([
        {target: apiServer, fromPort: 8080, protocol: 'tcp'},
      ]);

      const c = OpenshiftVm.satisfy(webServer.component)
        .withName('web')
        .withImage('nginx:latest')
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
      const rawVm = VirtualMachine.getBuilder()
        .withId('dep-vm')
        .withVersion(1, 0, 0)
        .withDisplayName('Dep VM')
        .build();
      const vmWithDep = {
        ...rawVm,
        dependencies: [{id: rawVm.id}],
      };

      const c = OpenshiftVm.satisfy(vmWithDep)
        .withName('vm')
        .withImage('rhel:9')
        .build();
      expect(c.dependencies).toHaveLength(1);
    });
  });
});
