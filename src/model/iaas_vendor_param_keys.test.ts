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
  SecurityGroup,
  Subnet,
  VirtualMachine,
  VirtualNetwork,
} from './components/network_and_compute';
import {
  AwsLb,
  AwsSubnet,
  AzureSubnet,
  GcpSubnet,
  AzureLb,
  GcpGlb,
  HetznerFirewall,
  HetznerNetwork,
  HetznerServer,
  HetznerSubnet,
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
      const subnet = bp.add(Subnet({id: 'edge-subnet'}));
      const base = LoadBalancer({id: 'edge-lb', subnets: [subnet]});
      const lb = bp.add(scheme === undefined ? base : base.withScheme(scheme));
      return {subnet, lb};
    },
    operations: s => ({
      setScheme: (v: string) => s.lb.set('scheme', v),
    }),
  });

const subnetFor = (offer: ReturnType<typeof AwsLb>) =>
  offer.provider === 'Azure'
    ? AzureSubnet({})
    : offer.provider === 'GCP'
      ? GcpSubnet({})
      : AwsSubnet({});

const lbParameters = (
  scheme: LoadBalancerScheme | undefined,
  offer: ReturnType<typeof AwsLb>,
) => {
  const ls = lbFractal(scheme)
    .specialize()
    .toLiveSystem({
      name: 'edge-ls',
      environment,
      select: {'edge-lb': offer, 'edge-subnet': subnetFor(offer)},
    });
  return ls.components.find(c => c.id === 'edge-lb')!.parameters;
};

describe('LoadBalancer subnets', () => {
  it('a load balancer declares its subnets, which become its dependencies', () => {
    const lb = lbFractal().blueprint.components.find(c => c.id === 'edge-lb')!;
    expect(lb.dependencies).toEqual(['edge-subnet']);
  });

  it('refuses a cloud load balancer without subnets when its offer is selected', () => {
    const bare = createFractal({
      id: 'edge',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({lb: bp.add(LoadBalancer({id: 'edge-lb'}))}),
      operations: () => ({}),
    });
    for (const [offer, subnet] of [
      [AwsLb({}), 'AwsSubnet'],
      [AzureLb({}), 'AzureSubnet'],
      [GcpGlb({}), 'GcpSubnet'],
    ] as const) {
      expect(() =>
        bare.toLiveSystem({
          name: 'edge-ls',
          environment,
          select: {'edge-lb': offer},
        }),
      ).toThrow(
        `LoadBalancer 'edge-lb' has no NetworkAndCompute.IaaS.${subnet} dependency`,
      );
    }
  });

  it('refuses an AWS load balancer whose subnet is not an AWS subnet', () => {
    expect(() =>
      lbFractal().toLiveSystem({
        name: 'edge-ls',
        environment,
        select: {'edge-lb': AwsLb({}), 'edge-subnet': GcpSubnet({})},
      }),
    ).toThrow(
      "LoadBalancer 'edge-lb' has no NetworkAndCompute.IaaS.AwsSubnet dependency",
    );
  });
});

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
    {
      name: 'GcpGlb',
      offer: GcpGlb({}),
      scheme: 'internal',
      expected: 'INTERNAL',
    },
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
        select: {'edge-lb': GcpGlb({}), 'edge-subnet': GcpSubnet({})},
      });
    expect(
      ls.components.find(c => c.id === 'edge-lb')!.parameters.lbScheme,
    ).toBe('EXTERNAL');
  });

  it('a scheme outside the neutral vocabulary is refused, naming the accepted values', () => {
    expect(() =>
      lbFractal()
        .specialize()
        .setScheme('EXTERNAL')
        .toLiveSystem({
          name: 'edge-ls',
          environment,
          select: {'edge-lb': AwsLb({}), 'edge-subnet': AwsSubnet({})},
        }),
    ).toThrow(/'edge-lb'.*'EXTERNAL'.*'internal' or 'internet-facing'/);
  });

  it('the blueprint keeps the neutral key and value', () => {
    const lb = lbFractal('internal').blueprint.components.find(
      c => c.id === 'edge-lb',
    )!;
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
              subnetAd === undefined ? {} : {availabilityZone: subnetAd},
            ),
            'app-vm': OciInstance({shape: 'VM.Standard.E4.Flex'}),
          },
        })
        .components.map(c => [c.id, c.parameters]),
    );

  it('OciSubnet takes the availability domain under the contract key availabilityZone', () => {
    const subnet = ociComponents('Uocm:EU-FRANKFURT-1-AD-1')['app-subnet'];
    expect(subnet.availabilityZone).toBe('Uocm:EU-FRANKFURT-1-AD-1');
    expect(subnet).not.toHaveProperty('availabilityDomain');
  });

  it('OciSubnet without an availabilityZone emits none', () => {
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

describe('Hetzner offers emit the types and keys aria-agent-hetzner reads', () => {
  const hetznerComponents = () =>
    Object.fromEntries(
      createFractal({
        id: 'hetzner-net',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => {
          const network = bp.add(
            VirtualNetwork({id: 'net'}).withCidrBlock('10.20.0.0/16'),
          );
          const subnet = bp.add(
            Subnet({id: 'subnet'})
              .withCidrBlock('10.20.1.0/24')
              .dependsOn(network),
          );
          const firewall = bp.add(
            SecurityGroup({id: 'fw'})
              .withIngressRules([
                {protocol: 'tcp', fromPort: 22, sourceCidr: '203.0.113.0/24'},
              ])
              .withEgressRules([
                {protocol: 'tcp', fromPort: 443, sourceCidr: '0.0.0.0/0'},
              ]),
          );
          const server = bp.add(VirtualMachine({id: 'vm'}).dependsOn(subnet));
          return {network, subnet, firewall, server};
        },
        operations: () => ({}),
      })
        .specialize()
        .toLiveSystem({
          name: 'hetzner-ls',
          environment,
          select: {
            net: HetznerNetwork({region: 'fsn1'}),
            subnet: HetznerSubnet({region: 'fsn1', networkZone: 'eu-central'}),
            fw: HetznerFirewall({region: 'fsn1'}),
            vm: HetznerServer({serverType: 'cx22', region: 'nbg1'}),
          },
        })
        .components.map(c => [c.id, c]),
    );

  it('HetznerServer is emitted as the HetznerCloudServer offer the agent reconciles', () => {
    expect(hetznerComponents().vm.type).toBe(
      'NetworkAndCompute.IaaS.HetznerCloudServer',
    );
  });

  it('HetznerServer region is emitted as location', () => {
    const vm = hetznerComponents().vm.parameters;
    expect(vm.location).toBe('nbg1');
    expect(vm).not.toHaveProperty('region');
    expect(vm.serverType).toBe('cx22');
  });

  it('HetznerNetwork cidrBlock is emitted as ipRange', () => {
    const net = hetznerComponents().net;
    expect(net.type).toBe('NetworkAndCompute.IaaS.HetznerNetwork');
    expect(net.parameters.ipRange).toBe('10.20.0.0/16');
    expect(net.parameters).not.toHaveProperty('cidrBlock');
  });

  it('HetznerSubnet keeps cidrBlock and networkZone', () => {
    const subnet = hetznerComponents().subnet;
    expect(subnet.type).toBe('NetworkAndCompute.IaaS.HetznerSubnet');
    expect(subnet.parameters.cidrBlock).toBe('10.20.1.0/24');
    expect(subnet.parameters.networkZone).toBe('eu-central');
  });

  it('HetznerFirewall egress rules carry their peer CIDR as destCidr', () => {
    const fw = hetznerComponents().fw;
    expect(fw.type).toBe('NetworkAndCompute.IaaS.HetznerFirewall');
    expect(fw.parameters.ingressRules).toEqual([
      {protocol: 'tcp', fromPort: 22, sourceCidr: '203.0.113.0/24'},
    ]);
    expect(fw.parameters.egressRules).toEqual([
      {protocol: 'tcp', fromPort: 443, destCidr: '0.0.0.0/0'},
    ]);
  });

  it('region is not emitted where the agent has no location to set', () => {
    const c = hetznerComponents();
    expect(c.net.parameters).not.toHaveProperty('region');
    expect(c.subnet.parameters).not.toHaveProperty('region');
    expect(c.fw.parameters).not.toHaveProperty('region');
  });
});
