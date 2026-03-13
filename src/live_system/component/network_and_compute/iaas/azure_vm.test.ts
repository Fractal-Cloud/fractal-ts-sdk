import {describe, expect, it} from 'vitest';
import {AzureVm} from './azure_vm';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-azure-vm',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Azure VM',
  vmSize: 'Standard_B2s',
  location: 'eastus',
  resourceGroup: 'my-rg',
  adminUsername: 'azureuser',
  imagePublisher: 'Canonical',
  imageOffer: '0001-com-ubuntu-server-jammy',
  imageSku: '22_04-lts',
};

describe('AzureVm', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = AzureVm.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.VirtualMachine');
    });

    it('should set provider to Azure', () => {
      const c = AzureVm.create(BASE_CONFIG);
      expect(c.provider).toBe('Azure');
    });

    it('should set required parameters', () => {
      const c = AzureVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('vmSize')).toBe(
        'Standard_B2s'
      );
      expect(c.parameters.getOptionalFieldByName('location')).toBe('eastus');
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'my-rg'
      );
      expect(c.parameters.getOptionalFieldByName('adminUsername')).toBe(
        'azureuser'
      );
      expect(c.parameters.getOptionalFieldByName('imagePublisher')).toBe(
        'Canonical'
      );
      expect(c.parameters.getOptionalFieldByName('imageOffer')).toBe(
        '0001-com-ubuntu-server-jammy'
      );
      expect(c.parameters.getOptionalFieldByName('imageSku')).toBe(
        '22_04-lts'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = AzureVm.create({
        ...BASE_CONFIG,
        sshPublicKey: 'ssh-rsa AAAA...',
        osDiskSizeGb: 64,
      });

      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-rsa AAAA...'
      );
      expect(c.parameters.getOptionalFieldByName('osDiskSizeGb')).toBe(64);
    });

    it('should not set optional params when omitted', () => {
      const c = AzureVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('osDiskSizeGb')).toBeNull();
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

      const c = AzureVm.satisfy(blueprint)
        .withVmSize('Standard_B2s')
        .withLocation('eastus')
        .withResourceGroup('rg')
        .withAdminUsername('azureuser')
        .withImagePublisher('Canonical')
        .withImageOffer('0001-com-ubuntu-server-jammy')
        .withImageSku('22_04-lts')
        .build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
      expect(c.description).toBe('A VM');
    });

    it('should allow setting all Azure VM-specific params after satisfy', () => {
      const {component: blueprint} = VirtualMachine.create({
        id: 'bp-vm-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM B',
      });

      const c = AzureVm.satisfy(blueprint)
        .withVmSize('Standard_D4s_v3')
        .withLocation('westeurope')
        .withResourceGroup('prod-rg')
        .withAdminUsername('admin')
        .withImagePublisher('Canonical')
        .withImageOffer('UbuntuServer')
        .withImageSku('18.04-LTS')
        .withSshPublicKey('ssh-rsa BBBB...')
        .withOsDiskSizeGb(128)
        .build();

      expect(c.parameters.getOptionalFieldByName('vmSize')).toBe(
        'Standard_D4s_v3'
      );
      expect(c.parameters.getOptionalFieldByName('location')).toBe(
        'westeurope'
      );
      expect(c.parameters.getOptionalFieldByName('resourceGroup')).toBe(
        'prod-rg'
      );
      expect(c.parameters.getOptionalFieldByName('adminUsername')).toBe(
        'admin'
      );
      expect(c.parameters.getOptionalFieldByName('imagePublisher')).toBe(
        'Canonical'
      );
      expect(c.parameters.getOptionalFieldByName('imageOffer')).toBe(
        'UbuntuServer'
      );
      expect(c.parameters.getOptionalFieldByName('imageSku')).toBe(
        '18.04-LTS'
      );
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-rsa BBBB...'
      );
      expect(c.parameters.getOptionalFieldByName('osDiskSizeGb')).toBe(128);
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

      const c = AzureVm.satisfy(webServer.component)
        .withVmSize('Standard_B2s')
        .withLocation('eastus')
        .withResourceGroup('rg')
        .withAdminUsername('azureuser')
        .withImagePublisher('Canonical')
        .withImageOffer('UbuntuServer')
        .withImageSku('18.04-LTS')
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

      const c = AzureVm.satisfy(vmWithDep)
        .withVmSize('Standard_B2s')
        .withLocation('eastus')
        .withResourceGroup('rg')
        .withAdminUsername('azureuser')
        .withImagePublisher('Canonical')
        .withImageOffer('UbuntuServer')
        .withImageSku('18.04-LTS')
        .build();
      expect(c.dependencies).toHaveLength(1);
    });
  });
});
