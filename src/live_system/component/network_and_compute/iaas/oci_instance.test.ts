import {describe, expect, it} from 'vitest';
import {OciInstance} from './oci_instance';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-instance',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My OCI Instance',
  compartmentId: 'ocid1.compartment.oc1..aaaaaa',
  availabilityDomain: 'AD-1',
  shape: 'VM.Standard.E4.Flex',
  imageId: 'ocid1.image.oc1..aaaaaa',
};

describe('OciInstance', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OciInstance.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.OciInstance');
    });

    it('should set provider to OCI', () => {
      const c = OciInstance.create(BASE_CONFIG);
      expect(c.provider).toBe('OCI');
    });

    it('should set required parameters', () => {
      const c = OciInstance.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..aaaaaa'
      );
      expect(c.parameters.getOptionalFieldByName('availabilityDomain')).toBe(
        'AD-1'
      );
      expect(c.parameters.getOptionalFieldByName('shape')).toBe(
        'VM.Standard.E4.Flex'
      );
      expect(c.parameters.getOptionalFieldByName('imageId')).toBe(
        'ocid1.image.oc1..aaaaaa'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = OciInstance.create({
        ...BASE_CONFIG,
        ocpus: 2,
        memoryInGbs: 16,
        sshPublicKey: 'ssh-rsa AAAA...',
      });
      expect(c.parameters.getOptionalFieldByName('ocpus')).toBe(2);
      expect(c.parameters.getOptionalFieldByName('memoryInGbs')).toBe(16);
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-rsa AAAA...'
      );
    });

    it('should not set optional params when omitted', () => {
      const c = OciInstance.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('ocpus')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('memoryInGbs')).toBeNull();
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBeNull();
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

      const c = OciInstance.satisfy(blueprint)
        .withCompartmentId('ocid1.compartment.oc1..bbbbbb')
        .withAvailabilityDomain('AD-2')
        .withShape('VM.Standard.E4.Flex')
        .withImageId('ocid1.image.oc1..bbbbbb')
        .build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
      expect(c.description).toBe('A VM');
    });

    it('should allow setting all OCI-specific params after satisfy', () => {
      const {component: blueprint} = VirtualMachine.create({
        id: 'bp-vm-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM B',
      });

      const c = OciInstance.satisfy(blueprint)
        .withCompartmentId('ocid1.compartment.oc1..cccccc')
        .withAvailabilityDomain('AD-3')
        .withShape('VM.Standard.A1.Flex')
        .withImageId('ocid1.image.oc1..cccccc')
        .withOcpus(4)
        .withMemoryInGbs(24)
        .withSshPublicKey('ssh-rsa BBBB...')
        .build();

      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..cccccc'
      );
      expect(c.parameters.getOptionalFieldByName('availabilityDomain')).toBe(
        'AD-3'
      );
      expect(c.parameters.getOptionalFieldByName('shape')).toBe(
        'VM.Standard.A1.Flex'
      );
      expect(c.parameters.getOptionalFieldByName('imageId')).toBe(
        'ocid1.image.oc1..cccccc'
      );
      expect(c.parameters.getOptionalFieldByName('ocpus')).toBe(4);
      expect(c.parameters.getOptionalFieldByName('memoryInGbs')).toBe(24);
      expect(c.parameters.getOptionalFieldByName('sshPublicKey')).toBe(
        'ssh-rsa BBBB...'
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

      const c = OciInstance.satisfy(webServer.component)
        .withCompartmentId('ocid1.compartment.oc1..dddddd')
        .withAvailabilityDomain('AD-1')
        .withShape('VM.Standard.E4.Flex')
        .withImageId('ocid1.image.oc1..dddddd')
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

      const c = OciInstance.satisfy(vmWithDep)
        .withCompartmentId('ocid1.compartment.oc1..eeeeee')
        .withAvailabilityDomain('AD-1')
        .withShape('VM.Standard.E4.Flex')
        .withImageId('ocid1.image.oc1..eeeeee')
        .build();
      expect(c.dependencies).toHaveLength(1);
    });
  });
});
