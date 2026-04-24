import {describe, expect, it} from 'vitest';
import {ArubaSshKeyPair} from './aruba_ssh_key_pair';

const BASE_CONFIG = {
  id: 'my-key',
  version: {major: 1, minor: 0, patch: 0},
  displayName: 'My SSH Key',
  publicKey: 'ssh-rsa AAAA... user@host',
};

describe('ArubaSshKeyPair', () => {
  describe('create()', () => {
    it('should build with the correct type string', () => {
      const c = ArubaSshKeyPair.create(BASE_CONFIG);
      expect(c.type.toString()).toBe('NetworkAndCompute.IaaS.ArubaSshKeyPair');
    });

    it('should set provider to Aruba', () => {
      const c = ArubaSshKeyPair.create(BASE_CONFIG);
      expect(c.provider).toBe('Aruba');
    });

    it('should set publicKey parameter', () => {
      const c = ArubaSshKeyPair.create(BASE_CONFIG);
      expect(c.parameters.getOptionalFieldByName('publicKey')).toBe(
        'ssh-rsa AAAA... user@host',
      );
    });

    it('should set keyName when provided', () => {
      const c = ArubaSshKeyPair.create({...BASE_CONFIG, keyName: 'prod-key'});
      expect(c.parameters.getOptionalFieldByName('keyName')).toBe('prod-key');
    });
  });
});
