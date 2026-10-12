/**
 * iaas_vendor_param_keys.test.ts — the IaaS parameters the SDK emits must be
 * the keys, and the values, each vendor's agent actually reads.
 *
 * A neutral guardrail only takes effect if the live component carries it under
 * the agent's key. `LoadBalancer.withScheme(...)` used to ship `scheme`, which
 * no agent reads (AWS `LoadBalancerConfig`, Azure `AzureLoadBalancerConfig` and
 * GCP `GcpLoadBalancerConfig` all read `lbScheme`), so every load balancer got
 * the agent default whatever the blueprint said. GCP also wants its own
 * spelling of the value (`INTERNAL` / `EXTERNAL`).
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {
  LoadBalancer,
  Subnet,
  VirtualMachine,
} from './components/network_and_compute';
import {
  AwsLb,
  AzureLb,
  GcpGlb,
  OciInstance,
  OciSubnet,
} from './offers/network_and_compute';
import type {LoadBalancerScheme} from './components/load_balancer_scheme';

const environment = {};
const boundedContextId = {id: 'network-templates'};

const lbFractal = (scheme?: LoadBalancerScheme) =>
  createFractal({
    id: 'edge',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const base = LoadBalancer({id: 'edge-lb'});
      const lb = bp.add(scheme === undefined ? base : base.withScheme(scheme));
      return {lb};
    },
    operations: s => ({
      setScheme: (v: string) => s.lb.set('scheme', v),
    }),
  });

const lbParameters = (
  scheme: LoadBalancerScheme | undefined,
  offer: ReturnType<typeof AwsLb>,
) => {
  const ls = lbFractal(scheme)
    .specialize()
    .toLiveSystem({name: 'edge-ls', environment, select: {'edge-lb': offer}});
  return ls.components.find(c => c.id === 'edge-lb')!.parameters;
};

describe('LoadBalancer scheme reaches each vendor agent', () => {
  it.each([
    {name: 'AwsLb', offer: AwsLb({}), scheme: 'internal', expected: 'internal'},
    {
      name: 'AwsLb',
      offer: AwsLb({}),
      scheme: 'internet-facing',
      expected: 'internet-facing',
    },
    {
      name: 'AzureLb',
      offer: AzureLb({}),
      scheme: 'internal',
      expected: 'internal',
    },
    {
      name: 'AzureLb',
      offer: AzureLb({}),
      scheme: 'internet-facing',
      expected: 'internet-facing',
    },
    {name: 'GcpGlb', offer: GcpGlb({}), scheme: 'internal', expected: 'INTERNAL'},
    {
      name: 'GcpGlb',
      offer: GcpGlb({}),
      scheme: 'internet-facing',
      expected: 'EXTERNAL',
    },
  ] as const)(
    '$name: withScheme($scheme) is emitted as lbScheme=$expected',
    ({offer, scheme, expected}) => {
      const parameters = lbParameters(scheme, offer);
      expect(parameters.lbScheme).toBe(expected);
      expect(parameters).not.toHaveProperty('scheme');
    },
  );

  it.each([
    {name: 'AwsLb', offer: AwsLb({})},
    {name: 'AzureLb', offer: AzureLb({})},
    {name: 'GcpGlb', offer: GcpGlb({})},
  ])(
    '$name: no scheme means no lbScheme, so the agent default applies',
    ({offer}) => {
      const parameters = lbParameters(undefined, offer);
      expect(parameters).not.toHaveProperty('lbScheme');
      expect(parameters).not.toHaveProperty('scheme');
    },
  );

  it('a dev-open scheme is translated too', () => {
    const ls = lbFractal()
      .specialize()
      .setScheme('internet-facing')
      .toLiveSystem({
        name: 'edge-ls',
        environment,
        select: {'edge-lb': GcpGlb({})},
      });
    expect(ls.components[0].parameters.lbScheme).toBe('EXTERNAL');
  });

  it('a scheme outside the neutral vocabulary is refused, naming the accepted values', () => {
    expect(() =>
      lbFractal()
        .specialize()
        .setScheme('EXTERNAL')
        .toLiveSystem({
          name: 'edge-ls',
          environment,
          select: {'edge-lb': AwsLb({})},
        }),
    ).toThrow(/'edge-lb'.*'EXTERNAL'.*'internal' or 'internet-facing'/);
  });

  it('the blueprint keeps the neutral key and value', () => {
    const lb = lbFractal('internal').blueprint.components[0];
    expect(lb.parameters.scheme).toBe('internal');
    expect(lb.locked).toContain('scheme');
  });
});

describe('OCI offers emit the keys the OCI agent reads', () => {
  const ociFractal = () =>
    createFractal({
      id: 'oci-net',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const subnet = bp.add(Subnet({id: 'app-subnet'}));
        const vm = bp.add(
          VirtualMachine({id: 'app-vm'})
            .withPublicSSHKey('ssh-ed25519 AAAAexample')
            .dependsOn(subnet),
        );
        return {subnet, vm};
      },
      operations: () => ({}),
    });

  const ociComponents = (subnetAd?: string) =>
    Object.fromEntries(
      ociFractal()
        .specialize()
        .toLiveSystem({
          name: 'oci-ls',
          environment,
          select: {
            'app-subnet': OciSubnet(
              subnetAd === undefined ? {} : {availabilityDomain: subnetAd},
            ),
            'app-vm': OciInstance({shape: 'VM.Standard.E4.Flex'}),
          },
        })
        .components.map(c => [c.id, c.parameters]),
    );

  it('OciSubnet availabilityDomain is emitted as availabilityZone (OciSubnetConfig)', () => {
    const subnet = ociComponents('Uocm:EU-FRANKFURT-1-AD-1')['app-subnet'];
    expect(subnet.availabilityZone).toBe('Uocm:EU-FRANKFURT-1-AD-1');
    expect(subnet).not.toHaveProperty('availabilityDomain');
  });

  it('OciSubnet without an availabilityDomain emits no availabilityZone', () => {
    expect(ociComponents()['app-subnet']).not.toHaveProperty(
      'availabilityZone',
    );
  });

  it('OciInstance carries the neutral publicSSHKey as keyName (OciComputeInstanceConfig)', () => {
    const vm = ociComponents()['app-vm'];
    expect(vm.keyName).toBe('ssh-ed25519 AAAAexample');
    expect(vm).not.toHaveProperty('publicSSHKey');
    expect(vm.shape).toBe('VM.Standard.E4.Flex');
  });
});
