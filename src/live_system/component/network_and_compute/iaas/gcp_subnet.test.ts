import {describe, expect, it} from 'vitest';
import {GcpSubnet} from './gcp_subnet';
import {
  Subnet,
  CIDR_BLOCK_PARAM,
} from '../../../../fractal/component/network_and_compute/iaas/subnet';

const BASE_CONFIG = {
  id: 'my-gcp-subnet',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My GCP Subnet',
  cidrBlock: '10.0.1.0/24',
  region: 'us-central1',
};

describe('GcpSubnet', () => {
  describe('create()', () => {
    it('should build a component with the correct type string', () => {
      const c = GcpSubnet.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.GcpSubnet');
    });

    it('should set provider to GCP', () => {
      const c = GcpSubnet.create(BASE_CONFIG);
      expect(c.provider).toBe('GCP');
    });

    it('should set cidrBlock and region parameters', () => {
      const c = GcpSubnet.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.1.0/24'
      );
      expect(c.parameters.getOptionalFieldByName('region')).toBe(
        'us-central1'
      );
    });

    it('should set optional privateIpGoogleAccess when provided', () => {
      const c = GcpSubnet.create({
        ...BASE_CONFIG,
        privateIpGoogleAccess: true,
      });
      expect(
        c.parameters.getOptionalFieldByName('privateIpGoogleAccess')
      ).toBe(true);
    });

    it('should not set optional params when omitted', () => {
      const c = GcpSubnet.create(BASE_CONFIG);
      expect(
        c.parameters.getOptionalFieldByName('privateIpGoogleAccess')
      ).toBeNull();
    });
  });

  describe('satisfy()', () => {
    it('should copy id, version, displayName from blueprint', () => {
      const {subnet} = Subnet.create({
        id: 'bp-gcp-subnet',
        version: {major: 3, minor: 2, patch: 1},
        displayName: 'Blueprint GCP Subnet',
        cidrBlock: '10.0.2.0/24',
      });

      const c = GcpSubnet.satisfy(subnet)
        .withRegion('europe-west1')
        .build();

      expect(c.id.toString()).toBe('bp-gcp-subnet');
      expect(c.version.major).toBe(3);
      expect(c.version.minor).toBe(2);
      expect(c.version.patch).toBe(1);
      expect(c.displayName).toBe('Blueprint GCP Subnet');
    });

    it('should carry cidrBlock from blueprint parameters', () => {
      const {subnet} = Subnet.create({
        id: 'bp-gcp-subnet',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint GCP Subnet',
        cidrBlock: '10.0.3.0/24',
      });

      const c = GcpSubnet.satisfy(subnet)
        .withRegion('us-central1')
        .build();

      expect(c.parameters.getOptionalFieldByName(CIDR_BLOCK_PARAM)).toBe(
        '10.0.3.0/24'
      );
    });

    it('should allow setting vendor-specific params after satisfy', () => {
      const {subnet} = Subnet.create({
        id: 'bp-gcp-subnet-b',
        version: {major: 1, minor: 0, patch: 0},
        displayName: 'Blueprint GCP Subnet B',
        cidrBlock: '10.0.4.0/24',
      });

      const c = GcpSubnet.satisfy(subnet)
        .withRegion('asia-east1')
        .withPrivateIpGoogleAccess(true)
        .build();

      expect(c.parameters.getOptionalFieldByName('region')).toBe('asia-east1');
      expect(
        c.parameters.getOptionalFieldByName('privateIpGoogleAccess')
      ).toBe(true);
    });
  });
});
