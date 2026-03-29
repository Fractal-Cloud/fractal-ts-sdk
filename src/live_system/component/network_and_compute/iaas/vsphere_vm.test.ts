import {describe, expect, it} from 'vitest';
import {VsphereVm} from './vsphere_vm';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-vm',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My vSphere VM',
  template: 'ubuntu-22.04-template',
  datacenter: 'dc-west',
  cluster: 'compute-cluster-a',
  datastore: 'datastore-ssd',
};

describe('VsphereVm', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = VsphereVm.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.VsphereVm');
    });

    it('should set provider to VMware', () => {
      const c = VsphereVm.create(BASE_CONFIG);
      expect(c.provider).toBe('VMware');
    });

    it('should set required template, datacenter, cluster, and datastore parameters', () => {
      const c = VsphereVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('template')).toBe(
        'ubuntu-22.04-template'
      );
      expect(c.parameters.getOptionalFieldByName('datacenter')).toBe(
        'dc-west'
      );
      expect(c.parameters.getOptionalFieldByName('cluster')).toBe(
        'compute-cluster-a'
      );
      expect(c.parameters.getOptionalFieldByName('datastore')).toBe(
        'datastore-ssd'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = VsphereVm.create({
        ...BASE_CONFIG,
        folder: '/vms/production',
        numCpus: 4,
        memoryMb: 8192,
        diskSizeGb: 100,
        guestId: 'ubuntu64Guest',
        hostname: 'app-server-a',
        sshPublicKey: 'ssh-rsa AAAA...',
        cloudInitUserData: 'IyEvYmluL2Jhc2g=',
        storagePolicy: 'vSAN Default Storage Policy',
        resourcePool: '/cluster-a/Resources/prod',
      });
      expect(c.parameters.getOptionalFieldByName('folder')).toBe(
        '/vms/production'
      );
      expect(c.parameters.getOptionalFieldByName('numCpus')).toBe(4);
      expect(c.parameters.getOptionalFieldByName('memoryMb')).toBe(8192);
      expect(c.parameters.getOptionalFieldByName('diskSizeGb')).toBe(100);
      expect(c.parameters.getOptionalFieldByName('guestId')).toBe(
        'ubuntu64Guest'
      );
      expect(c.parameters.getOptionalFieldByName('hostname')).toBe(
        'app-server-a'
      );
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-rsa AAAA...'
      );
      expect(c.parameters.getOptionalFieldByName('cloudInitUserData')).toBe(
        'IyEvYmluL2Jhc2g='
      );
      expect(c.parameters.getOptionalFieldByName('storagePolicy')).toBe(
        'vSAN Default Storage Policy'
      );
      expect(c.parameters.getOptionalFieldByName('resourcePool')).toBe(
        '/cluster-a/Resources/prod'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = VsphereVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('folder')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('numCpus')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('memoryMb')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('diskSizeGb')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('guestId')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('hostname')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('cloudInitUserData')
      ).toBeNull();
      expect(c.parameters.getOptionalFieldByName('storagePolicy')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('resourcePool')).toBeNull();
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

      const c = VsphereVm.satisfy(blueprint)
        .withTemplate('ubuntu-22.04-template')
        .withDatacenter('dc-west')
        .withCluster('compute-cluster-a')
        .withDatastore('datastore-ssd')
        .build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
      expect(c.description).toBe('A VM');
    });

    it('should allow setting all VMware-specific params after satisfy', () => {
      const {component: blueprint} = VirtualMachine.create({
        id: 'bp-vm-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM B',
      });

      const c = VsphereVm.satisfy(blueprint)
        .withTemplate('debian-12-template')
        .withDatacenter('dc-east')
        .withCluster('compute-cluster-b')
        .withDatastore('datastore-nvme')
        .withFolder('/vms/staging')
        .withNumCpus(8)
        .withMemoryMb(16384)
        .withDiskSizeGb(200)
        .withGuestId('debian10_64Guest')
        .withHostname('web-server')
        .withSshPublicKey('ssh-ed25519 AAAA...')
        .withCloudInitUserData('IyEvYmluL2Jhc2g=')
        .withStoragePolicy('Thin Provision')
        .withResourcePool('/cluster-b/Resources/staging')
        .build();

      expect(c.parameters.getOptionalFieldByName('template')).toBe(
        'debian-12-template'
      );
      expect(c.parameters.getOptionalFieldByName('datacenter')).toBe(
        'dc-east'
      );
      expect(c.parameters.getOptionalFieldByName('cluster')).toBe(
        'compute-cluster-b'
      );
      expect(c.parameters.getOptionalFieldByName('datastore')).toBe(
        'datastore-nvme'
      );
      expect(c.parameters.getOptionalFieldByName('folder')).toBe(
        '/vms/staging'
      );
      expect(c.parameters.getOptionalFieldByName('numCpus')).toBe(8);
      expect(c.parameters.getOptionalFieldByName('memoryMb')).toBe(16384);
      expect(c.parameters.getOptionalFieldByName('diskSizeGb')).toBe(200);
      expect(c.parameters.getOptionalFieldByName('guestId')).toBe(
        'debian10_64Guest'
      );
      expect(c.parameters.getOptionalFieldByName('hostname')).toBe(
        'web-server'
      );
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-ed25519 AAAA...'
      );
      expect(c.parameters.getOptionalFieldByName('cloudInitUserData')).toBe(
        'IyEvYmluL2Jhc2g='
      );
      expect(c.parameters.getOptionalFieldByName('storagePolicy')).toBe(
        'Thin Provision'
      );
      expect(c.parameters.getOptionalFieldByName('resourcePool')).toBe(
        '/cluster-b/Resources/staging'
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

      const c = VsphereVm.satisfy(webServer.component)
        .withTemplate('ubuntu-22.04-template')
        .withDatacenter('dc-west')
        .withCluster('compute-cluster-a')
        .withDatastore('datastore-ssd')
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

      const c = VsphereVm.satisfy(vmWithDep)
        .withTemplate('ubuntu-22.04-template')
        .withDatacenter('dc-west')
        .withCluster('compute-cluster-a')
        .withDatastore('datastore-ssd')
        .build();
      expect(c.dependencies).toHaveLength(1);
    });
  });
});
