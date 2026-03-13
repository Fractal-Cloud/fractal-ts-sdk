import {describe, expect, it} from 'vitest';
import {OciContainerInstance} from './oci_container_instance';
import {Workload} from '../../../../fractal/component/custom_workloads/caas/workload';

const BASE_CONFIG = {
  id: 'my-instance',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My Instance',
  imageUrl: 'phx.ocir.io/namespace/repo:latest',
  availabilityDomain: 'AD-1',
  compartmentId: 'ocid1.compartment.oc1..xxx',
};

describe('OciContainerInstance', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = OciContainerInstance.create(BASE_CONFIG);
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.OciContainerInstance',
      );
    });

    it('should set provider to OCI', () => {
      const c = OciContainerInstance.create(BASE_CONFIG);
      expect(c.provider).toBe('OCI');
    });

    it('should set id, displayName, and required params', () => {
      const c = OciContainerInstance.create({
        ...BASE_CONFIG,
        description: 'My OCI instance',
      });
      expect(c.id.toString()).toBe('my-instance');
      expect(c.displayName).toBe('My Instance');
      expect(c.description).toBe('My OCI instance');
      expect(c.parameters.getOptionalFieldByName('imageUrl')).toBe(
        'phx.ocir.io/namespace/repo:latest',
      );
      expect(c.parameters.getOptionalFieldByName('availabilityDomain')).toBe(
        'AD-1',
      );
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..xxx',
      );
    });

    it('should set optional params when provided', () => {
      const c = OciContainerInstance.create({
        ...BASE_CONFIG,
        ocpus: 2,
        memoryInGbs: 8,
        shape: 'CI.Standard.E4.Flex',
        port: 8080,
        assignPublicIp: true,
        containerRestartPolicy: 'ALWAYS',
      });
      expect(c.parameters.getOptionalFieldByName('ocpus')).toBe(2);
      expect(c.parameters.getOptionalFieldByName('memoryInGBs')).toBe(8);
      expect(c.parameters.getOptionalFieldByName('shape')).toBe(
        'CI.Standard.E4.Flex',
      );
      expect(c.parameters.getOptionalFieldByName('port')).toBe(8080);
      expect(c.parameters.getOptionalFieldByName('assignPublicIp')).toBe(true);
      expect(
        c.parameters.getOptionalFieldByName('containerRestartPolicy'),
      ).toBe('ALWAYS');
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, and displayName from blueprint workload', () => {
      const workload = Workload.create({
        id: 'bp-instance',
        version: {major: 2, minor: 0, patch: 0},
        displayName: 'BP Instance',
        containerImage: 'phx.ocir.io/namespace/repo:latest',
      });

      const c = OciContainerInstance.satisfy(workload.component)
        .withAvailabilityDomain('AD-1')
        .withCompartmentId('ocid1.compartment.oc1..xxx')
        .build();
      expect(c.id.toString()).toBe('bp-instance');
      expect(c.version.major).toBe(2);
      expect(c.displayName).toBe('BP Instance');
    });

    it('should carry containerImage as imageUrl from blueprint', () => {
      const workload = Workload.create({
        id: 'bp-instance',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Instance',
        containerImage: 'phx.ocir.io/namespace/repo:v1',
      });

      const c = OciContainerInstance.satisfy(workload.component)
        .withAvailabilityDomain('AD-1')
        .withCompartmentId('ocid1.compartment.oc1..xxx')
        .build();
      expect(c.parameters.getOptionalFieldByName('imageUrl')).toBe(
        'phx.ocir.io/namespace/repo:v1',
      );
    });

    it('should allow setting vendor-specific params via sealed builder', () => {
      const workload = Workload.create({
        id: 'bp-instance',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'BP Instance',
        containerImage: 'nginx:latest',
      });

      const c = OciContainerInstance.satisfy(workload.component)
        .withAvailabilityDomain('AD-2')
        .withCompartmentId('ocid1.compartment.oc1..yyy')
        .withOcpus(4)
        .withMemoryInGbs(16)
        .withShape('CI.Standard.E4.Flex')
        .withAssignPublicIp(false)
        .withContainerRestartPolicy('ON_FAILURE')
        .build();

      expect(c.parameters.getOptionalFieldByName('availabilityDomain')).toBe(
        'AD-2',
      );
      expect(c.parameters.getOptionalFieldByName('compartmentId')).toBe(
        'ocid1.compartment.oc1..yyy',
      );
      expect(c.parameters.getOptionalFieldByName('ocpus')).toBe(4);
      expect(c.parameters.getOptionalFieldByName('memoryInGBs')).toBe(16);
      expect(c.parameters.getOptionalFieldByName('shape')).toBe(
        'CI.Standard.E4.Flex',
      );
      expect(c.parameters.getOptionalFieldByName('assignPublicIp')).toBe(
        false,
      );
      expect(
        c.parameters.getOptionalFieldByName('containerRestartPolicy'),
      ).toBe('ON_FAILURE');
    });

    it('should carry links from blueprint workload', () => {
      const apiWorkload = Workload.create({
        id: 'api-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'API',
        containerImage: 'api:latest',
      });
      const webWorkload = Workload.create({
        id: 'web-workload',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Web',
        containerImage: 'nginx:latest',
      }).linkToWorkload([{target: apiWorkload, fromPort: 8080}]);

      const c = OciContainerInstance.satisfy(webWorkload.component)
        .withAvailabilityDomain('AD-1')
        .withCompartmentId('ocid1.compartment.oc1..xxx')
        .build();

      expect(c.links).toHaveLength(1);
      expect(c.links[0].id.toString()).toBe('api-workload');
      expect(c.links[0].parameters.getOptionalFieldByName('fromPort')).toBe(
        8080,
      );
    });
  });

  describe('getBuilder()', () => {
    it('should build an instance via fluent builder', () => {
      const c = OciContainerInstance.getBuilder()
        .withId('instance-b')
        .withVersion(2, 0, 0)
        .withDisplayName('Instance B')
        .withImageUrl('phx.ocir.io/namespace/repo:latest')
        .withAvailabilityDomain('AD-1')
        .withCompartmentId('ocid1.compartment.oc1..xxx')
        .build();
      expect(c.type.toString()).toBe(
        'NetworkAndCompute.PaaS.OciContainerInstance',
      );
      expect(c.id.toString()).toBe('instance-b');
      expect(c.version.major).toBe(2);
    });
  });
});
