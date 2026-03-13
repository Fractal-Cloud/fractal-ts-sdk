import {describe, expect, it} from 'vitest';
import {GcpVm} from './gcp_vm';
import {VirtualMachine} from '../../../../fractal/component/network_and_compute/iaas/vm';

const BASE_CONFIG = {
  id: 'my-gcp-vm',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My GCP VM',
  machineType: 'e2-medium',
  zone: 'us-central1-a',
  imageProject: 'debian-cloud',
};

describe('GcpVm', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpVm.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.GcpVm');
    });

    it('should set provider to GCP', () => {
      const c = GcpVm.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set required parameters', () => {
      const c = GcpVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('machineType')).toBe(
        'e2-medium'
      );
      expect(c.parameters.getOptionalFieldByName('zone')).toBe(
        'us-central1-a'
      );
      expect(c.parameters.getOptionalFieldByName('imageProject')).toBe(
        'debian-cloud'
      );
    });

    it('should set optional parameters when provided', () => {
      const c = GcpVm.create({
        ...BASE_CONFIG,
        imageFamily: 'debian-11',
        serviceAccountEmail: 'sa@project.iam.gserviceaccount.com',
      });

      expect(c.parameters.getOptionalFieldByName('imageFamily')).toBe(
        'debian-11'
      );
      expect(
        c.parameters.getOptionalFieldByName('serviceAccountEmail')
      ).toBe('sa@project.iam.gserviceaccount.com');
    });

    it('should not set optional params when omitted', () => {
      const c = GcpVm.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('imageFamily')).toBeNull();
      expect(
        c.parameters.getOptionalFieldByName('serviceAccountEmail')
      ).toBeNull();
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

      const c = GcpVm.satisfy(blueprint)
        .withMachineType('n1-standard-1')
        .withZone('us-central1-a')
        .withImageProject('debian-cloud')
        .build();

      expect(c.id.toString()).toBe('bp-vm');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('Blueprint VM');
      expect(c.description).toBe('A VM');
    });

    it('should allow setting all GCP VM-specific params after satisfy', () => {
      const {component: blueprint} = VirtualMachine.create({
        id: 'bp-vm-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint VM B',
      });

      const c = GcpVm.satisfy(blueprint)
        .withMachineType('n2-standard-4')
        .withZone('europe-west1-b')
        .withImageProject('ubuntu-os-cloud')
        .withImageFamily('ubuntu-2204-lts')
        .withServiceAccountEmail('sa@proj.iam.gserviceaccount.com')
        .build();

      expect(c.parameters.getOptionalFieldByName('machineType')).toBe(
        'n2-standard-4'
      );
      expect(c.parameters.getOptionalFieldByName('zone')).toBe(
        'europe-west1-b'
      );
      expect(c.parameters.getOptionalFieldByName('imageProject')).toBe(
        'ubuntu-os-cloud'
      );
      expect(c.parameters.getOptionalFieldByName('imageFamily')).toBe(
        'ubuntu-2204-lts'
      );
      expect(
        c.parameters.getOptionalFieldByName('serviceAccountEmail')
      ).toBe('sa@proj.iam.gserviceaccount.com');
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

      const c = GcpVm.satisfy(webServer.component)
        .withMachineType('e2-medium')
        .withZone('us-central1-a')
        .withImageProject('debian-cloud')
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

      const c = GcpVm.satisfy(vmWithDep)
        .withMachineType('e2-medium')
        .withZone('us-central1-a')
        .withImageProject('debian-cloud')
        .build();
      expect(c.dependencies).toHaveLength(1);
    });
  });
});
