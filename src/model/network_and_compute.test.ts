/**
 * network_and_compute.test.ts — executable spec for the NetworkAndCompute domain.
 *
 * Authors a vendor-agnostic Fractal (VirtualNetwork + Subnet + SecurityGroup +
 * VirtualMachine + ContainerPlatform) with guardrails and dependencies, then
 * specializes and selects offers to build a LiveSystem. Proves: guardrails are
 * locked, structure (dependencies) is preserved, offer selection drives the
 * live component type/provider, and a wrong offer is rejected at compile time
 * AND at runtime.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {
  VirtualNetwork,
  Subnet,
  SecurityGroup,
  VirtualMachine,
  ContainerPlatform,
} from './components/network_and_compute';
import {
  AwsVpc,
  AwsSubnet,
  AwsSecurityGroup,
  Ec2Instance,
  Eks,
  VsphereVm,
  GcpVm,
} from './offers/network_and_compute';

const environment = {};
const boundedContextId = {id: 'network-templates'};

function authorFractal() {
  return createFractal({
    id: 'standard-network',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const network = bp.add(
        VirtualNetwork({id: 'main-network'})
          .withCidrBlock('10.0.0.0/16')
          .withTags({team: 'platform'}),
      );
      const subnet = bp.add(
        Subnet({id: 'app-subnet'})
          .withCidrBlock('10.0.1.0/24')
          .dependsOn(network),
      );
      const sg = bp.add(
        SecurityGroup({id: 'app-sg'})
          .withIngressRules([
            {protocol: 'tcp', fromPort: 443, sourceCidr: '0.0.0.0/0'},
          ])
          .dependsOn(network),
      );
      const vm = bp.add(
        VirtualMachine({id: 'app-vm'})
          .withOsType('linux')
          .withSize('medium')
          .dependsOn(subnet),
      );
      const cluster = bp.add(
        ContainerPlatform({id: 'app-cluster'})
          .withKubernetesVersion('1.29')
          .withNodePools([
            {
              name: 'default',
              minNodeCount: 1,
              maxNodeCount: 5,
              autoscalingEnabled: true,
            },
          ])
          .dependsOn(subnet),
      );
      return {network, subnet, sg, vm, cluster};
    },
    operations: s => ({
      // dev-open neutral param: subnet cidr is NOT a locked guardrail here…
      // (it IS locked in this fractal, so this op exists only to prove locking).
      tryOverrideSubnetCidr: (v: string) => s.subnet.set('cidrBlock', v),
    }),
  });
}

const fullSelect = () => ({
  'main-network': AwsVpc({region: 'us-east-1'}),
  'app-subnet': AwsSubnet({}),
  'app-sg': AwsSecurityGroup({}),
  'app-vm': Ec2Instance({amiId: 'ami-123', instanceType: 't3.medium'}),
  'app-cluster': Eks({}),
});

describe('NetworkAndCompute domain', () => {
  it('blueprint records guardrails (tags array) and locks them', () => {
    const net = authorFractal().blueprint.components.find(
      c => c.id === 'main-network',
    )!;
    expect(net.parameters.tags).toEqual({team: 'platform'});
    expect(net.parameters.cidrBlock).toBe('10.0.0.0/16');
    expect(net.locked).toContain('cidrBlock');

    const sg = authorFractal().blueprint.components.find(
      c => c.id === 'app-sg',
    )!;
    expect(sg.parameters.ingressRules).toEqual([
      {protocol: 'tcp', fromPort: 443, sourceCidr: '0.0.0.0/0'},
    ]);
    expect(sg.locked).toContain('ingressRules');
  });

  it('a locked guardrail cannot be overridden by a dev op', () => {
    expect(() =>
      authorFractal().specialize().tryOverrideSubnetCidr('10.0.99.0/24'),
    ).toThrow(/locked guardrail/);
  });

  it('LiveSystem: offer selection drives type/provider; dependencies preserved', () => {
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({name: 'acme-net', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['main-network'].type).toBe('NetworkAndCompute.IaaS.AwsVpc');
    expect(byId['main-network'].provider).toBe('AWS');
    expect(byId['app-vm'].type).toBe('NetworkAndCompute.IaaS.AwsEc2Instance');
    expect(byId['app-vm'].parameters.amiId).toBe('ami-123');
    // guardrail flowed into the live component
    expect(byId['main-network'].parameters.cidrBlock).toBe('10.0.0.0/16');
    // structure (dependency) preserved through specialization + selection
    expect(byId['app-subnet'].dependencies).toContain('main-network');
    expect(byId['app-vm'].dependencies).toContain('app-subnet');
  });

  it('optional userData on a VM offer flows through to live-component parameters', () => {
    const script = '#!/bin/bash\necho hi';
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({
        name: 'acme-net',
        environment,
        select: {
          ...fullSelect(),
          'app-vm': Ec2Instance({
            amiId: 'ami-123',
            instanceType: 't3.medium',
            userData: script,
          }),
        },
      });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['app-vm'].parameters.userData).toBe(script);
  });

  it('userData is absent from parameters when omitted', () => {
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({name: 'acme-net', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['app-vm'].parameters.userData).toBeUndefined();
  });

  it('userData passes through raw on every VM offer, including vSphere', () => {
    const script = '#cloud-config\nruncmd:\n  - echo hi';
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({
        name: 'acme-net',
        environment,
        select: {
          ...fullSelect(),
          'app-vm': VsphereVm({template: 'ubuntu-22', userData: script}),
        },
      });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    // SDK forwards the raw script under the uniform `userData` key for all
    // vendors; each agent owns its own encoding (vSphere base64-encodes it).
    expect(byId['app-vm'].parameters.userData).toBe(script);
    expect(byId['app-vm'].parameters.template).toBe('ubuntu-22');
  });

  it('optional boot image flows through under the vendor image key', () => {
    const imageLink =
      'projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts';
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({
        name: 'acme-net',
        environment,
        select: {
          ...fullSelect(),
          'app-vm': GcpVm({machineType: 'e2-medium', imageLink}),
        },
      });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    // Property name IS the wire key: GcpVm emits `imageLink`, matching the agent param.
    expect(byId['app-vm'].parameters.imageLink).toBe(imageLink);
  });

  it('optional workload identity flows through as a nested object', () => {
    const identity = {
      serviceAccount: 'eval@project.iam.gserviceaccount.com',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    };
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({
        name: 'acme-net',
        environment,
        select: {
          ...fullSelect(),
          'app-vm': GcpVm({machineType: 'e2-medium', identity}),
        },
      });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    // The whole identity object is forwarded intact under the uniform `identity` key.
    expect(byId['app-vm'].parameters.identity).toEqual(identity);
  });

  it('workload identity is absent from parameters when omitted', () => {
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({name: 'acme-net', environment, select: fullSelect()});

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['app-vm'].parameters.identity).toBeUndefined();
  });

  it('selecting a wrong offer is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          ...fullSelect(),
          // @ts-expect-error AwsVpc (VirtualNetwork) cannot satisfy NetworkAndCompute.Subnet
          'app-subnet': AwsVpc({}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });
});
