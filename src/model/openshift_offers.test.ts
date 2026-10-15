/**
 * openshift_offers.test.ts — the OpenShift offers emit the offer types
 * aria-agent-openshift reconciles, and an OpenShift load balancer takes its
 * address from the one MetalLB IP address pool (its Subnet) it depends on.
 *
 * Before 2.13.0 two offer types matched no agent offer
 * (`NetworkAndCompute.CaaS.OpenshiftNetworkPolicy`,
 * `NetworkAndCompute.CaaS.OpenshiftVm`), and a LoadBalancer on OpenShift had
 * no Subnet offer to select: the agent refuses a `LoadBalancer` Service
 * without exactly one `OpenshiftIpAddressPool` dependency.
 */
import {describe, expect, it} from 'vitest';
import {createFractal} from './core';
import {
  LoadBalancer,
  SecurityGroup,
  Subnet,
  VirtualMachine,
} from './components/network_and_compute';
import {Workload} from './components/custom_workloads';
import {ObjectStorage} from './components/storage';
import {OpenshiftWorkload} from './offers/custom_workloads';
import {OpenshiftPersistentVolume} from './offers/storage';
import {
  OpenshiftIpAddressPool,
  OpenshiftSecurityGroup,
  OpenshiftService,
  OpenshiftVm,
  VsphereVlan,
} from './offers/network_and_compute';

const environment = {};
const boundedContextId = {id: 'onprem'};

const lbFractal = (subnets: 0 | 1 | 2 = 1) =>
  createFractal({
    id: 'onprem-edge',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const pool = bp.add(Subnet({id: 'lb-pool'}));
      const other = bp.add(Subnet({id: 'other-pool'}));
      const lb = bp.add(
        subnets === 0
          ? LoadBalancer({id: 'web-service'})
          : LoadBalancer({
              id: 'web-service',
              subnets: subnets === 1 ? [pool] : [pool, other],
            }),
      );
      return {pool, other, lb};
    },
    operations: () => ({}),
  });

const pool = (name: string) =>
  OpenshiftIpAddressPool({name, addresses: ['192.168.10.240/28']});

describe('OpenShift offer types', () => {
  it('a security group is the agent offer NetworkAndCompute.CaaS.OpenshiftSecurityGroup', () => {
    expect(OpenshiftSecurityGroup.offerType).toBe(
      'NetworkAndCompute.CaaS.OpenshiftSecurityGroup',
    );
  });

  it('a virtual machine is the agent offer NetworkAndCompute.IaaS.OpenshiftVirtualMachine', () => {
    expect(OpenshiftVm.offerType).toBe(
      'NetworkAndCompute.IaaS.OpenshiftVirtualMachine',
    );
    expect(OpenshiftVm({}).deliveryModel).toBe('IaaS');
  });

  it('an IP address pool is a Subnet', () => {
    expect(OpenshiftIpAddressPool.offerType).toBe(
      'NetworkAndCompute.CaaS.OpenshiftIpAddressPool',
    );
    expect(OpenshiftIpAddressPool.satisfies).toBe('NetworkAndCompute.Subnet');
  });

  it('emits the security group and the virtual machine under the agent types', () => {
    const ls = createFractal({
      id: 'onprem-vm',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        sg: bp.add(SecurityGroup({id: 'policy'})),
        vm: bp.add(VirtualMachine({id: 'legacy-vm'})),
      }),
      operations: () => ({}),
    }).toLiveSystem({
      name: 'onprem-vm-ls',
      environment,
      select: {
        policy: OpenshiftSecurityGroup({}),
        'legacy-vm': OpenshiftVm({
          name: 'legacy',
          image: 'quay.io/containerdisks/fedora:40',
        }),
      },
    });
    expect(ls.components.map(c => [c.id, c.type])).toEqual([
      ['policy', 'NetworkAndCompute.CaaS.OpenshiftSecurityGroup'],
      ['legacy-vm', 'NetworkAndCompute.IaaS.OpenshiftVirtualMachine'],
    ]);
  });
});

describe('OpenShift load balancer subnet', () => {
  it('a LoadBalancer Service depends on its IP address pool, which carries the pool parameters', () => {
    const ls = lbFractal().toLiveSystem({
      name: 'onprem-edge-ls',
      environment,
      select: {
        'web-service': OpenshiftService({serviceType: 'LoadBalancer'}),
        'lb-pool': pool('web'),
        'other-pool': pool('spare'),
      },
    });
    const service = ls.components.find(c => c.id === 'web-service')!;
    expect(service.type).toBe('NetworkAndCompute.CaaS.OpenshiftService');
    expect(service.dependencies).toEqual(['lb-pool']);
    expect(service.parameters).toMatchObject({serviceType: 'LoadBalancer'});
    const lbPool = ls.components.find(c => c.id === 'lb-pool')!;
    expect(lbPool).toMatchObject({
      type: 'NetworkAndCompute.CaaS.OpenshiftIpAddressPool',
      provider: 'RedHat',
      parameters: {name: 'web', addresses: ['192.168.10.240/28']},
    });
  });

  it('translates the Subnet CIDR guardrail into the pool addresses', () => {
    const ls = createFractal({
      id: 'onprem-cidr',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        pool: bp.add(Subnet({id: 'lb-pool'}).withCidrBlock('10.0.0.0/28')),
      }),
      operations: () => ({}),
    }).toLiveSystem({
      name: 'onprem-cidr-ls',
      environment,
      select: {'lb-pool': OpenshiftIpAddressPool({name: 'web'})},
    });
    expect(ls.components[0].parameters).toMatchObject({
      name: 'web',
      addresses: ['10.0.0.0/28'],
    });
  });

  it('refuses a LoadBalancer Service without subnets', () => {
    expect(() =>
      lbFractal(0).toLiveSystem({
        name: 'onprem-edge-ls',
        environment,
        select: {
          'web-service': OpenshiftService({serviceType: 'LoadBalancer'}),
          'lb-pool': pool('web'),
          'other-pool': pool('spare'),
        },
      }),
    ).toThrow(
      "LoadBalancer 'web-service' has no NetworkAndCompute.CaaS.OpenshiftIpAddressPool dependency",
    );
  });

  // The agent resolves a pool only for serviceType LoadBalancer; its default is
  // ClusterIP. Exposure without an address of its own needs no subnet.
  for (const serviceType of ['ClusterIP', 'NodePort', undefined] as const) {
    const label = serviceType ?? 'unset-serviceType (ClusterIP)';
    const config = serviceType === undefined ? {} : {serviceType};

    it(`accepts a ${label} Service without subnets`, () => {
      const ls = lbFractal(0).toLiveSystem({
        name: 'onprem-edge-ls',
        environment,
        select: {
          'web-service': OpenshiftService({...config, createRoute: true}),
          'lb-pool': pool('web'),
          'other-pool': pool('spare'),
        },
      });
      expect(
        ls.components.find(c => c.id === 'web-service')!.dependencies,
      ).toEqual([]);
    });

    it(`refuses a ${label} Service that declares a subnet, which it would not use`, () => {
      expect(() =>
        lbFractal().toLiveSystem({
          name: 'onprem-edge-ls',
          environment,
          select: {
            'web-service': OpenshiftService(config),
            'lb-pool': pool('web'),
            'other-pool': pool('spare'),
          },
        }),
      ).toThrow(
        `LoadBalancer 'web-service' is a ${serviceType ?? 'ClusterIP'} Service, which takes ` +
          "no address from a subnet, but declares subnet 'lb-pool' " +
          '(NetworkAndCompute.CaaS.OpenshiftIpAddressPool). Fix: remove the subnet from ' +
          "LoadBalancer({subnets}), or select OpenshiftService({serviceType: 'LoadBalancer'}).",
      );
    });
  }

  it('refuses an OpenShift load balancer whose subnet is not an IP address pool', () => {
    expect(() =>
      lbFractal().toLiveSystem({
        name: 'onprem-edge-ls',
        environment,
        select: {
          'web-service': OpenshiftService({serviceType: 'LoadBalancer'}),
          'lb-pool': VsphereVlan({}),
          'other-pool': pool('spare'),
        },
      }),
    ).toThrow(
      "LoadBalancer 'web-service' has no NetworkAndCompute.CaaS.OpenshiftIpAddressPool dependency",
    );
  });

  it('refuses an OpenShift load balancer with two IP address pools', () => {
    expect(() =>
      lbFractal(2).toLiveSystem({
        name: 'onprem-edge-ls',
        environment,
        select: {
          'web-service': OpenshiftService({serviceType: 'LoadBalancer'}),
          'lb-pool': pool('web'),
          'other-pool': pool('spare'),
        },
      }),
    ).toThrow(
      "LoadBalancer 'web-service' depends on 2 NetworkAndCompute.CaaS.OpenshiftIpAddressPool " +
        'components (lb-pool, other-pool), but takes its address from exactly one: keep one.',
    );
  });

  it('refuses an OpenShift load balancer that also declares a subnet of another offer', () => {
    expect(() =>
      lbFractal(2).toLiveSystem({
        name: 'onprem-edge-ls',
        environment,
        select: {
          'web-service': OpenshiftService({serviceType: 'LoadBalancer'}),
          'lb-pool': pool('web'),
          'other-pool': VsphereVlan({}),
        },
      }),
    ).toThrow(
      "LoadBalancer 'web-service' declares subnet 'other-pool' " +
        '(NetworkAndCompute.IaaS.VsphereVlan), which aria-agent-openshift does not read',
    );
  });

  it('refuses the scheme guardrail, which a MetalLB address cannot honor', () => {
    expect(() =>
      createFractal({
        id: 'onprem-scheme',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => {
          const p = bp.add(Subnet({id: 'lb-pool'}));
          return {
            p,
            lb: bp.add(
              LoadBalancer({id: 'web-service', subnets: [p]}).withScheme(
                'internal',
              ),
            ),
          };
        },
        operations: () => ({}),
      }).toLiveSystem({
        name: 'onprem-scheme-ls',
        environment,
        select: {
          'web-service': OpenshiftService({serviceType: 'LoadBalancer'}),
          'lb-pool': pool('web'),
        },
      }),
    ).toThrow(
      "Offer NetworkAndCompute.CaaS.OpenshiftService, selected for 'web-service', cannot honor withScheme ('scheme')",
    );
  });
});

describe('OpenShift parameters in the agent shape', () => {
  it('sends the network policy rules as the JSON strings the agent parses, egress peers as destCidr', () => {
    const ls = createFractal({
      id: 'onprem-sg',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        sg: bp.add(
          SecurityGroup({id: 'policy'})
            .withIngressRules([
              {protocol: 'tcp', fromPort: 80, sourceCidr: '0.0.0.0/0'},
            ])
            .withEgressRules([
              {protocol: 'tcp', fromPort: 5432, sourceCidr: '10.0.0.0/24'},
            ]),
        ),
      }),
      operations: () => ({}),
    }).toLiveSystem({
      name: 'onprem-sg-ls',
      environment,
      select: {policy: OpenshiftSecurityGroup({policyType: 'Both'})},
    });
    const {parameters} = ls.components[0];
    expect(parameters.policyType).toBe('Both');
    expect(JSON.parse(parameters.ingressRules as string)).toEqual([
      {protocol: 'tcp', fromPort: 80, sourceCidr: '0.0.0.0/0'},
    ]);
    expect(JSON.parse(parameters.egressRules as string)).toEqual([
      {protocol: 'tcp', fromPort: 5432, destCidr: '10.0.0.0/24'},
    ]);
  });

  it('sends the workload environment as envVars and resources as requests and limits', () => {
    const ls = createFractal({
      id: 'onprem-wl',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        api: bp.add(
          Workload({id: 'api'})
            .withEnv({LOG_LEVEL: 'info'})
            .withResources({
              requests: {cpu: '250m', memory: '512Mi'},
              limits: {cpu: '1', memory: '1Gi'},
            }),
        ),
      }),
      operations: () => ({}),
    }).toLiveSystem({
      name: 'onprem-wl-ls',
      environment,
      select: {api: OpenshiftWorkload({namespace: 'apps'})},
    });
    expect(ls.components[0]).toMatchObject({
      type: 'CustomWorkloads.CaaS.OpenshiftWorkload',
      parameters: {
        namespace: 'apps',
        envVars: '{"LOG_LEVEL":"info"}',
        cpuRequest: '250m',
        memoryRequest: '512Mi',
        cpuLimit: '1',
        memoryLimit: '1Gi',
      },
    });
    expect(ls.components[0].parameters).not.toHaveProperty('env');
    expect(ls.components[0].parameters).not.toHaveProperty('resources');
  });

  it('refuses a workload guardrail the agent cannot honor', () => {
    expect(() =>
      createFractal({
        id: 'onprem-wl',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => ({
          api: bp.add(
            Workload({id: 'api'}).withAutoscaling({
              minReplicas: 2,
              maxReplicas: 4,
            }),
          ),
        }),
        operations: () => ({}),
      }).toLiveSystem({
        name: 'onprem-wl-ls',
        environment,
        select: {api: OpenshiftWorkload({})},
      }),
    ).toThrow(
      "Offer CustomWorkloads.CaaS.OpenshiftWorkload, selected for 'api', cannot honor withAutoscaling ('autoscaling'), a guardrail locked in the Fractal: aria-agent-openshift's workload contract declares no autoscaling",
    );
  });

  it('sends the VM public key as sshPublicKey', () => {
    const ls = createFractal({
      id: 'onprem-vm',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({
        vm: bp.add(
          VirtualMachine({id: 'legacy-vm'}).withPublicSSHKey(
            'ssh-ed25519 AAAAexample',
          ),
        ),
      }),
      operations: () => ({}),
    }).toLiveSystem({
      name: 'onprem-vm-ls',
      environment,
      select: {
        'legacy-vm': OpenshiftVm({name: 'legacy', image: 'quay.io/vm:1'}),
      },
    });
    expect(ls.components[0]).toMatchObject({
      deliveryModel: 'IaaS',
      parameters: {
        name: 'legacy',
        image: 'quay.io/vm:1',
        sshPublicKey: 'ssh-ed25519 AAAAexample',
      },
    });
    expect(ls.components[0].parameters).not.toHaveProperty('publicSSHKey');
  });

  it('accepts private object storage on a volume claim and refuses a storage tier', () => {
    const build = (tier?: string) =>
      createFractal({
        id: 'onprem-pv',
        version: {major: 1, minor: 0, patch: 0},
        boundedContextId,
        blueprint: bp => {
          const base = ObjectStorage({id: 'data'}).withPublicAccess(false);
          return {
            data: bp.add(
              tier === undefined ? base : base.withStorageClass(tier),
            ),
          };
        },
        operations: () => ({}),
      }).toLiveSystem({
        name: 'onprem-pv-ls',
        environment,
        select: {
          data: OpenshiftPersistentVolume({name: 'data', storageSize: '10Gi'}),
        },
      });
    expect(build().components[0].parameters).toEqual({
      name: 'data',
      storageSize: '10Gi',
    });
    expect(() => build('STANDARD_IA')).toThrow(
      "cannot honor withStorageClass ('storageClass')",
    );
  });

  it('refuses an IP address pool without addresses', () => {
    expect(() =>
      lbFractal().toLiveSystem({
        name: 'onprem-edge-ls',
        environment,
        select: {
          'web-service': OpenshiftService({serviceType: 'LoadBalancer'}),
          'lb-pool': OpenshiftIpAddressPool({name: 'web'}),
          'other-pool': pool('spare'),
        },
      }),
    ).toThrow(
      "Subnet 'lb-pool' (NetworkAndCompute.CaaS.OpenshiftIpAddressPool) has no addresses",
    );
  });
});
