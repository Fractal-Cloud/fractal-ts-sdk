/**
 * cross_component_rules.test.ts — executable spec for the checks that involve
 * more than one component, run by `toLiveSystem` before anything is sent.
 *
 * Each rule mirrors one an agent applies at reconcile time and fails the
 * component on (a dependency of a given type, a link setting the target's agent
 * requires, a placement two components must agree on). Every case builds a Live
 * System that is valid but for the one thing under test, so the refusal it
 * expects is that rule's and no other.
 */
import {describe, it, expect} from 'vitest';
import {createFractal, type AnyNode, type Offer} from './core';
import {
  ContainerPlatform,
  LoadBalancer,
  SecurityGroup,
  Subnet,
  VirtualMachine,
  VirtualNetwork,
} from './components/network_and_compute';
import {Workload} from './components/custom_workloads';
import {
  RelationalDatabase,
  RelationalDbms,
  ObjectStorage,
} from './components/storage';
import {Broker, MessagingEntity} from './components/messaging';
import {ComputeCluster, DistributedDataProcessing} from './components/big_data';
import {IdentityProvider} from './components/security';
import {ApiGateway} from './components/api_management';
import {CertificateManager} from './components/certificate_manager';
import {gatewayRouteSettings} from './components/gateway_route_settings';
import {
  Aks,
  AwsLb,
  AwsSecurityGroup,
  AwsSubnet,
  AwsVpc,
  AzureSubnet,
  AzureVnet,
  Ec2Instance,
  EcsCluster,
  Eks,
  GcpFirewall,
  GcpSubnet,
  GcpVm,
  GcpVpc,
  HetznerNetwork,
  HetznerServer,
  OpenshiftSecurityGroup,
} from './offers/network_and_compute';
import {EcsService, K8sWorkload} from './offers/custom_workloads';
import {
  AwsRdsMySqlDatabase,
  AwsRdsMySqlDbms,
  AwsRdsPostgresDatabase,
  AwsRdsPostgresDbms,
  AwsS3,
  GcpPostgresDatabase,
  GcpPostgresDbms,
} from './offers/storage';
import {
  AwsSnsTopic,
  AwsSqsQueue,
  AzureServiceBusTopic,
  Kafka,
  KafkaTopic,
} from './offers/messaging';
import {
  AwsDatabricks,
  AwsDatabricksCluster,
  GcpDatabricks,
} from './offers/big_data';
import {CertManager, Cognito} from './offers/security';
import {AwsCloudFront, TraefikGateway} from './offers/api_management';

/** A configured offer whose required configuration is irrelevant to the rule. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const any = (ctor: (config: any) => Offer, config: object = {}): Offer =>
  ctor(config);

/** Build a Live System from a blueprint and a selection, without typed slots. */
const build = (
  blueprint: (bp: {
    add: <N extends AnyNode>(n: N) => N;
    link: (s: AnyNode, t: AnyNode, settings?: Record<string, unknown>) => void;
  }) => Record<string, AnyNode>,
  select: Record<string, Offer>,
) =>
  createFractal({
    id: 'cross-component',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {name: 'rules'},
    blueprint,
  }).toLiveSystem({
    name: 'rules',
    environment: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: select as any,
  });

const AWS_NETWORK = {
  vpc: any(AwsVpc),
  subnet: any(AwsSubnet),
};

// ── Whole Live System ────────────────────────────────────────────────────────
describe('cycles of dependencies and links', () => {
  const twoVms = (backLink: boolean) =>
    build(
      bp => {
        const vpc = bp.add(
          VirtualNetwork({id: 'vpc'}).withCidrBlock('10.0.0.0/16'),
        );
        const subnet = bp.add(Subnet({id: 'subnet'}).dependsOn(vpc));
        const web = bp.add(VirtualMachine({id: 'web'}).dependsOn(subnet));
        const api = bp.add(VirtualMachine({id: 'api'}).dependsOn(subnet));
        bp.link(web, api, {fromPort: 8080});
        if (backLink) {
          bp.link(api, web, {fromPort: 9090});
        }
        return {vpc, subnet, web, api};
      },
      {...AWS_NETWORK, web: any(Ec2Instance), api: any(Ec2Instance)},
    );

  it('accepts a link in one direction', () => {
    expect(() => twoVms(false)).not.toThrow();
  });

  it('refuses two components linking to each other', () => {
    expect(() => twoVms(true)).toThrow(
      /Live components 'web' -> 'api' -> 'web' form a cycle of dependencies and links/,
    );
  });
});

// ── IaaS placement ───────────────────────────────────────────────────────────
describe('IaaS atoms are placed by their declared dependencies', () => {
  it('refuses a subnet without a network', () => {
    expect(() =>
      build(
        bp => ({
          subnet: bp.add(Subnet({id: 'subnet'}).withCidrBlock('10.0.1.0/24')),
        }),
        {
          subnet: any(AwsSubnet),
        },
      ),
    ).toThrow(
      /'subnet' \(NetworkAndCompute\.IaaS\.AwsSubnet\) has no NetworkAndCompute\.IaaS\.AwsVpc dependency.*select AwsVpc/,
    );
  });

  it('refuses a subnet whose network is of another cloud', () => {
    expect(() =>
      build(
        bp => {
          const vnet = bp.add(
            VirtualNetwork({id: 'vnet'}).withCidrBlock('10.0.0.0/16'),
          );
          return {vnet, subnet: bp.add(Subnet({id: 'subnet'}).dependsOn(vnet))};
        },
        {vnet: any(AzureVnet), subnet: any(AwsSubnet)},
      ),
    ).toThrow(/has no NetworkAndCompute\.IaaS\.AwsVpc dependency/);
  });

  const carved = (vpcCidr: string | undefined, subnets: string[]) =>
    build(
      bp => {
        const node = VirtualNetwork({id: 'vpc'});
        const vpc = bp.add(
          vpcCidr === undefined ? node : node.withCidrBlock(vpcCidr),
        );
        const slots: Record<string, AnyNode> = {vpc};
        for (const id of subnets) {
          slots[id] = bp.add(Subnet({id}).dependsOn(vpc));
        }
        return slots;
      },
      {
        vpc: any(AwsVpc),
        ...Object.fromEntries(subnets.map(id => [id, any(AwsSubnet)])),
      },
    );

  it('carves a subnet without a range from its network', () => {
    expect(() => carved('10.0.0.0/16', ['a', 'b'])).not.toThrow();
  });

  it('refuses a subnet without a range when its network has none', () => {
    expect(() => carved(undefined, ['a'])).toThrow(
      /'a' .* declares no 'cidrBlock' and its network 'vpc' has no address block/,
    );
  });

  it('refuses a subnet whose carved /24 falls outside its network', () => {
    expect(() => carved('10.0.0.0/23', ['a', 'b', 'c'])).toThrow(
      /'c' .* as subnet 3 of network 'vpc' its carved \/24 falls outside the network's block 10\.0\.0\.0\/23/,
    );
  });

  it('refuses a security group without a network', () => {
    expect(() =>
      build(bp => ({sg: bp.add(SecurityGroup({id: 'sg'}))}), {
        sg: any(AwsSecurityGroup),
      }),
    ).toThrow(/'sg' .* has no NetworkAndCompute\.IaaS\.AwsVpc dependency/);
  });

  const vm = (vmOffer: Offer, subnetOffer: Offer, vpcOffer: Offer) =>
    build(
      bp => {
        // A GCP VPC has no address range of its own; its subnets carry it.
        const vpc = bp.add(VirtualNetwork({id: 'vpc'}));
        const subnet = bp.add(
          Subnet({id: 'subnet'}).withCidrBlock('10.0.1.0/24').dependsOn(vpc),
        );
        return {
          vpc,
          subnet,
          vm: bp.add(VirtualMachine({id: 'vm'}).dependsOn(subnet)),
        };
      },
      {vpc: vpcOffer, subnet: subnetOffer, vm: vmOffer},
    );

  it('refuses a VM whose subnet is of another cloud', () => {
    expect(() => vm(any(GcpVm), any(AzureSubnet), any(AzureVnet))).toThrow(
      /'vm' \(NetworkAndCompute\.IaaS\.GcpVm\) has no NetworkAndCompute\.IaaS\.GcpSubnet dependency/,
    );
  });

  it('refuses a GCP VM in another region than its subnet', () => {
    expect(() =>
      vm(
        any(GcpVm, {region: 'europe-west1'}),
        any(GcpSubnet, {region: 'europe-west4'}),
        any(GcpVpc),
      ),
    ).toThrow(
      /declares region 'europe-west1', but its subnet 'subnet' is in region 'europe-west4'/,
    );
    expect(() =>
      vm(
        any(GcpVm, {zone: 'europe-west1-b'}),
        any(GcpSubnet, {region: 'europe-west4'}),
        any(GcpVpc),
      ),
    ).toThrow(/declares zone 'europe-west1-b' \(region 'europe-west1'\)/);
    expect(() =>
      vm(
        any(GcpVm, {zone: 'europe-west4-a'}),
        any(GcpSubnet, {region: 'europe-west4'}),
        any(GcpVpc),
      ),
    ).not.toThrow();
  });

  it('refuses a VM without a subnet', () => {
    expect(() =>
      build(bp => ({vm: bp.add(VirtualMachine({id: 'vm'}))}), {
        vm: any(Ec2Instance),
      }),
    ).toThrow(/'vm' .* has no NetworkAndCompute\.IaaS\.AwsSubnet dependency/);
  });

  it('refuses a Hetzner server with no interface', () => {
    const server = (associatePublicIp: boolean, network: boolean) =>
      build(
        bp => {
          const net = bp.add(
            VirtualNetwork({id: 'net'}).withCidrBlock('10.0.0.0/16'),
          );
          const node = VirtualMachine({id: 'server'});
          return {net, server: bp.add(network ? node.dependsOn(net) : node)};
        },
        {
          net: any(HetznerNetwork),
          server: any(HetznerServer, {serverType: 'cx22', associatePublicIp}),
        },
      );
    expect(() => server(false, false)).toThrow(
      /'server' .* has no NetworkAndCompute\.IaaS\.HetznerNetwork dependency/,
    );
    expect(() => server(true, false)).not.toThrow();
    expect(() => server(false, true)).not.toThrow();
  });

  it('refuses a traffic link between VMs without fromPort', () => {
    const linked = (settings: Record<string, unknown>) =>
      build(
        bp => {
          const vpc = bp.add(
            VirtualNetwork({id: 'vpc'}).withCidrBlock('10.0.0.0/16'),
          );
          const subnet = bp.add(Subnet({id: 'subnet'}).dependsOn(vpc));
          const web = bp.add(VirtualMachine({id: 'web'}).dependsOn(subnet));
          const api = bp.add(VirtualMachine({id: 'api'}).dependsOn(subnet));
          bp.link(web, api, settings);
          return {vpc, subnet, web, api};
        },
        {...AWS_NETWORK, web: any(Ec2Instance), api: any(Ec2Instance)},
      );
    expect(() => linked({protocol: 'tcp'})).toThrow(
      /Link from 'web' to 'api' .* declares no 'fromPort'/,
    );
    expect(() => linked({fromPort: 8080})).not.toThrow();
  });

  it('refuses a firewall without members', () => {
    const firewall = (member: boolean) =>
      build(
        bp => {
          const vpc = bp.add(VirtualNetwork({id: 'vpc'}));
          const subnet = bp.add(
            Subnet({id: 'subnet'}).withCidrBlock('10.0.1.0/24').dependsOn(vpc),
          );
          const fw = bp.add(SecurityGroup({id: 'fw'}).dependsOn(vpc));
          const vm = bp.add(VirtualMachine({id: 'vm'}).dependsOn(subnet));
          if (member) {
            bp.link(vm, fw);
          }
          return {vpc, subnet, fw, vm};
        },
        {
          vpc: any(GcpVpc),
          subnet: any(GcpSubnet),
          fw: any(GcpFirewall),
          vm: any(GcpVm),
        },
      );
    expect(() => firewall(false)).toThrow(/'fw' .* has no members/);
    expect(() => firewall(true)).not.toThrow();
  });

  it('refuses an OpenShift network policy without members', () => {
    expect(() =>
      build(bp => ({sg: bp.add(SecurityGroup({id: 'sg'}))}), {
        sg: any(OpenshiftSecurityGroup),
      }),
    ).toThrow(
      /'sg' .* has no members: nothing links to it and 'podSelector' is not set/,
    );
  });

  it('refuses a load balancer listener the agent would skip', () => {
    const lb = (settings: Record<string, unknown>) =>
      build(
        bp => {
          const vpc = bp.add(
            VirtualNetwork({id: 'vpc'}).withCidrBlock('10.0.0.0/16'),
          );
          const subnet = bp.add(Subnet({id: 'subnet'}).dependsOn(vpc));
          const vm = bp.add(VirtualMachine({id: 'vm'}).dependsOn(subnet));
          const edge = bp.add(LoadBalancer({id: 'edge', subnets: [subnet]}));
          const front = bp.add(VirtualMachine({id: 'front'}).dependsOn(subnet));
          bp.link(edge, vm, {tgPort: 8080});
          bp.link(front, edge, settings);
          return {vpc, subnet, vm, edge, front};
        },
        {
          ...AWS_NETWORK,
          vm: any(Ec2Instance),
          front: any(Ec2Instance),
          edge: any(AwsLb),
        },
      );
    expect(() => lb({listenerPort: 443, listenerProtocol: 'HTTPS'})).toThrow(
      /Link from 'front' to 'edge' .* without 'targetComponentId'/,
    );
    expect(() =>
      lb({
        listenerPort: 443,
        listenerProtocol: 'HTTPS',
        targetComponentId: 'front',
      }),
    ).toThrow(/forwards to 'front', which this load balancer does not link to/);
    expect(() =>
      lb({
        listenerPort: 443,
        listenerProtocol: 'HTTPS',
        targetComponentId: 'vm',
      }),
    ).not.toThrow();
  });
});

// ── Workloads ────────────────────────────────────────────────────────────────
describe('workloads run where they declare', () => {
  it('refuses an ECS service without a cluster or a subnet', () => {
    const ecs = (cluster: boolean) =>
      build(
        bp => {
          const vpc = bp.add(
            VirtualNetwork({id: 'vpc'}).withCidrBlock('10.0.0.0/16'),
          );
          const subnet = bp.add(Subnet({id: 'subnet'}).dependsOn(vpc));
          const platform = bp.add(ContainerPlatform({id: 'platform'}));
          const node = Workload({id: 'svc'})
            .withImage('registry/svc:1')
            .dependsOn(subnet);
          return {
            vpc,
            subnet,
            platform,
            svc: bp.add(cluster ? node.dependsOn(platform) : node),
          };
        },
        {...AWS_NETWORK, platform: any(EcsCluster), svc: any(EcsService)},
      );
    expect(() => ecs(false)).toThrow(
      /'svc' .* has no NetworkAndCompute\.PaaS\.ECS dependency/,
    );
    expect(() => ecs(true)).not.toThrow();
  });

  const onPlatform = (platformOffer: Offer | undefined, workloadDeps = 1) =>
    build(
      bp => {
        const a = bp.add(ContainerPlatform({id: 'a'}));
        const b = bp.add(ContainerPlatform({id: 'b'}));
        let node = Workload({id: 'api'}).withImage('registry/api:1');
        if (workloadDeps >= 1) {
          node = node.dependsOn(a);
        }
        if (workloadDeps >= 2) {
          node = node.dependsOn(b);
        }
        return {a, b, api: bp.add(node)};
      },
      {a: platformOffer ?? any(Eks), b: any(Eks), api: any(K8sWorkload)},
    );

  it('refuses a Kubernetes workload with no cluster, or with two', () => {
    expect(() => onPlatform(undefined, 1)).not.toThrow();
    expect(() => onPlatform(undefined, 0)).toThrow(
      /'api' .* runs on Kubernetes but no Kubernetes cluster is among its dependencies/,
    );
    expect(() => onPlatform(undefined, 2)).toThrow(
      /depends on 2 Kubernetes clusters \[a, b\]/,
    );
  });

  it('refuses a Kubernetes workload on an ECS cluster', () => {
    expect(() => onPlatform(any(EcsCluster), 1)).toThrow(
      /no Kubernetes cluster is among its dependencies/,
    );
  });

  it('reaches the cluster of a Kafka topic through its Kafka', () => {
    const kafka = (topicOnKafka: boolean) =>
      build(
        bp => {
          const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
          const broker = bp.add(Broker({id: 'kafka'}).dependsOn(cluster));
          const node = MessagingEntity({id: 'orders'});
          return {
            cluster,
            broker,
            topic: bp.add(topicOnKafka ? node.dependsOn(broker) : node),
          };
        },
        {cluster: any(Eks), kafka: any(Kafka), orders: any(KafkaTopic)},
      );
    expect(() => kafka(true)).not.toThrow();
    expect(() => kafka(false)).toThrow(
      /'orders' .* has no Messaging\.CaaS\.Kafka dependency/,
    );
  });

  it('refuses cert-manager on a cluster that is not EKS', () => {
    const certs = (cluster: Offer) =>
      build(
        bp => {
          const platform = bp.add(ContainerPlatform({id: 'platform'}));
          return {
            platform,
            certs: bp.add(
              CertificateManager({id: 'certs'}).dependsOn(platform),
            ),
          };
        },
        {
          platform: cluster,
          certs: any(CertManager, {
            hostedZoneId: 'Z1',
            role: 'arn:aws:iam::1:role/r',
            email: 'a@b.c',
          }),
        },
      );
    expect(() => certs(any(Eks))).not.toThrow();
    expect(() => certs(any(Aks))).toThrow(
      /runs on cluster 'platform' \(NetworkAndCompute\.PaaS\.AzureAks\), but it needs an EKS cluster/,
    );
  });

  const withLinks = (
    links: (
      bp: {link: (s: AnyNode, t: AnyNode, x?: Record<string, unknown>) => void},
      n: Record<string, AnyNode>,
    ) => void,
    env?: Record<string, string>,
  ) =>
    build(
      bp => {
        const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
        const dbms = bp.add(RelationalDbms({id: 'dbms'}));
        const orders = bp.add(
          RelationalDatabase({id: 'orders'}).dependsOn(dbms),
        );
        const billing = bp.add(
          RelationalDatabase({id: 'billing'}).dependsOn(dbms),
        );
        const queue = bp.add(MessagingEntity({id: 'inbox'}));
        const node = Workload({id: 'api'})
          .withImage('registry/api:1')
          .dependsOn(cluster);
        const api = bp.add(env === undefined ? node : node.withEnv(env));
        const nodes = {cluster, dbms, orders, billing, queue, api};
        links(bp, nodes);
        return nodes;
      },
      {
        cluster: any(Eks),
        dbms: any(AwsRdsPostgresDbms),
        orders: any(AwsRdsPostgresDatabase),
        billing: any(AwsRdsPostgresDatabase),
        inbox: any(AwsSqsQueue),
        api: any(K8sWorkload),
      },
    );

  it('refuses two links that bind one environment variable', () => {
    expect(() =>
      withLinks((bp, n) => {
        bp.link(n.api, n.orders, {access: 'read-write'});
        bp.link(n.api, n.billing, {access: 'read-only'});
      }),
    ).toThrow(
      /binds environment variable DB_HOST through its links to both 'orders' and 'billing'/,
    );
    expect(() =>
      withLinks((bp, n) => {
        bp.link(n.api, n.orders, {access: 'read-write'});
        bp.link(n.api, n.billing, {access: 'read-only', envPrefix: 'billing'});
      }),
    ).not.toThrow();
  });

  it('refuses a link-bound variable the workload also sets in env', () => {
    expect(() =>
      withLinks((bp, n) => bp.link(n.api, n.queue, {access: 'subscribe'}), {
        QUEUE_URL_INBOX: 'https://example.invalid',
      }),
    ).toThrow(
      /sets environment variable QUEUE_URL_INBOX both through its link to 'inbox' and in env/,
    );
  });
});

// ── Link settings, checked on the link's target ──────────────────────────────
describe('link settings the target requires', () => {
  const consumer = (
    target: AnyNode,
    offer: Offer,
    settings: Record<string, unknown>,
    extra?: (bp: {
      add: <N extends AnyNode>(n: N) => N;
    }) => Record<string, AnyNode>,
  ) =>
    build(
      bp => {
        const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
        const more = extra === undefined ? {} : extra(bp);
        const t = bp.add(target);
        const api = bp.add(
          Workload({id: 'api'}).withImage('registry/api:1').dependsOn(cluster),
        );
        bp.link(api, t, settings);
        return {cluster, t, api, ...more};
      },
      {cluster: any(Eks), [target.state.id]: offer, api: any(K8sWorkload)},
    );

  it('refuses a database link without a valid access', () => {
    const db = (settings: Record<string, unknown>) =>
      build(
        bp => {
          const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
          const dbms = bp.add(RelationalDbms({id: 'dbms'}));
          const orders = bp.add(
            RelationalDatabase({id: 'orders'}).dependsOn(dbms),
          );
          const api = bp.add(
            Workload({id: 'api'})
              .withImage('registry/api:1')
              .dependsOn(cluster),
          );
          bp.link(api, orders, settings);
          return {cluster, dbms, orders, api};
        },
        {
          cluster: any(Eks),
          dbms: any(AwsRdsPostgresDbms),
          orders: any(AwsRdsPostgresDatabase),
          api: any(K8sWorkload),
        },
      );
    expect(() => db({})).toThrow(
      /Link from 'api' to 'orders' .* declares no database access/,
    );
    expect(() => db({access: 'write'})).toThrow(
      /'access' is 'write'; it must be one of read-only, read-write/,
    );
    expect(() => db({accessMode: 'readWrite'})).not.toThrow();
    expect(() => db({roleName: 'data_reader'})).not.toThrow();
    expect(() => db({access: 'read-only'})).not.toThrow();
  });

  it('refuses a bucket link without a valid access', () => {
    const bucket = (settings: Record<string, unknown>) =>
      consumer(ObjectStorage({id: 'files'}), any(AwsS3), settings);
    expect(() => bucket({})).toThrow(
      /Link from 'api' to 'files' .* declares no 'access'/,
    );
    expect(() => bucket({access: 'readwrite'})).toThrow(
      /'access' is 'readwrite'; it must be read, write or read-write/,
    );
    expect(() => bucket({access: 'read-write'})).not.toThrow();
  });

  it('refuses a queue link without a valid access, and a subscribing topic link', () => {
    expect(() =>
      consumer(MessagingEntity({id: 'inbox'}), any(AwsSqsQueue), {}),
    ).toThrow(/Link from 'api' to 'inbox' .* declares no 'access'/);
    expect(() =>
      consumer(MessagingEntity({id: 'events'}), any(AwsSnsTopic), {
        access: 'subscribe',
      }),
    ).toThrow(/subscribes to an SNS topic, which grants nothing/);
    expect(() =>
      consumer(MessagingEntity({id: 'events'}), any(AwsSnsTopic), {
        access: 'publish',
      }),
    ).not.toThrow();
  });

  it('refuses an identity provider link the agent cannot provision a client for', () => {
    const idp = (settings: Record<string, unknown>) =>
      consumer(IdentityProvider({id: 'idp'}), any(Cognito), settings);
    expect(() => idp({clientType: 'desktop'})).toThrow(
      /'clientType' is 'desktop'; it must be web, spa or machine/,
    );
    expect(() => idp({clientType: 'spa'})).toThrow(
      /a spa client logs users in and needs the 'redirectUris'/,
    );
    expect(() => idp({})).toThrow(/a web client .* needs the 'redirectUris'/);
    expect(() => idp({clientType: 'machine'})).not.toThrow();
    expect(() =>
      idp({clientType: 'web', redirectUris: ['https://app.example.com/cb']}),
    ).not.toThrow();
  });
});

// ── Storage ──────────────────────────────────────────────────────────────────
describe('databases and their DBMS', () => {
  it('refuses a database without a DBMS of its engine', () => {
    const db = (dbmsOffer: Offer, dbOffer: Offer) =>
      build(
        bp => {
          const dbms = bp.add(RelationalDbms({id: 'dbms'}));
          return {
            dbms,
            orders: bp.add(RelationalDatabase({id: 'orders'}).dependsOn(dbms)),
          };
        },
        {dbms: dbmsOffer, orders: dbOffer},
      );
    expect(() =>
      db(any(AwsRdsPostgresDbms), any(AwsRdsPostgresDatabase)),
    ).not.toThrow();
    expect(() => db(any(AwsRdsMySqlDbms), any(AwsRdsPostgresDatabase))).toThrow(
      /'orders' .* has no Storage\.PaaS\.AwsRdsPostgres dependency: a database cannot exist without the server/,
    );
  });

  it('refuses two MySQL databases whose ids differ only by case', () => {
    const twins = (databaseName?: string) =>
      build(
        bp => {
          const dbms = bp.add(RelationalDbms({id: 'dbms'}));
          return {
            dbms,
            a: bp.add(RelationalDatabase({id: 'Orders'}).dependsOn(dbms)),
            b: bp.add(RelationalDatabase({id: 'orders'}).dependsOn(dbms)),
          };
        },
        {
          dbms: any(AwsRdsMySqlDbms),
          Orders: any(AwsRdsMySqlDatabase),
          orders: any(
            AwsRdsMySqlDatabase,
            databaseName === undefined ? {} : {databaseName},
          ),
        },
      );
    expect(() => twins()).toThrow(
      /would be the same database on DBMS 'dbms' as/,
    );
    expect(() => twins('orders_v2')).not.toThrow();
  });

  it('refuses RDS subnets the DB subnet group cannot span', () => {
    const rds = (zones: string[], twoVpcs = false) =>
      build(
        bp => {
          const vpc = bp.add(
            VirtualNetwork({id: 'vpc'}).withCidrBlock('10.0.0.0/16'),
          );
          const other = bp.add(
            VirtualNetwork({id: 'other'}).withCidrBlock('10.1.0.0/16'),
          );
          const slots: Record<string, AnyNode> = {vpc, other};
          let dbms = RelationalDbms({id: 'dbms'});
          zones.forEach((_, i) => {
            const subnet = bp.add(
              Subnet({id: `s${i}`}).dependsOn(twoVpcs && i === 1 ? other : vpc),
            );
            slots[`s${i}`] = subnet;
            dbms = dbms.dependsOn(subnet);
          });
          slots.dbms = bp.add(dbms);
          return slots;
        },
        {
          vpc: any(AwsVpc),
          other: any(AwsVpc),
          dbms: any(AwsRdsPostgresDbms),
          ...Object.fromEntries(
            zones.map((z, i) => [
              `s${i}`,
              any(AwsSubnet, {availabilityZone: z}),
            ]),
          ),
        },
      );
    expect(() => rds(['eu-central-1a', 'eu-central-1b'])).not.toThrow();
    expect(() => rds(['eu-central-1a'])).toThrow(
      /declares subnets in only one Availability Zone/,
    );
    expect(() => rds(['eu-central-1a', 'eu-central-1a'])).toThrow(
      /only one Availability Zone/,
    );
    expect(() => rds(['eu-central-1a', 'eu-central-1b'], true)).toThrow(
      /declares subnets in more than one VPC/,
    );
  });

  it('refuses a Cloud SQL database depending on something else than its instance', () => {
    expect(() =>
      build(
        bp => {
          const vpc = bp.add(VirtualNetwork({id: 'vpc'}));
          const dbms = bp.add(RelationalDbms({id: 'dbms'}));
          return {
            vpc,
            dbms,
            orders: bp.add(
              RelationalDatabase({id: 'orders'}).dependsOn(dbms).dependsOn(vpc),
            ),
          };
        },
        {
          vpc: any(GcpVpc),
          dbms: any(GcpPostgresDbms),
          orders: any(GcpPostgresDatabase),
        },
      ),
    ).toThrow(/depends on \[vpc\], which are not Cloud SQL instances/);
  });
});

// ── Messaging ────────────────────────────────────────────────────────────────
describe('queues, topics and their brokers', () => {
  const queue = (
    topics: {id: string; region?: string}[],
    queueRegion?: string,
  ) =>
    build(
      bp => {
        const slots: Record<string, AnyNode> = {};
        let q = MessagingEntity({id: 'inbox'});
        for (const t of topics) {
          slots[t.id] = bp.add(MessagingEntity({id: t.id}));
          q = q.dependsOn(slots[t.id]);
        }
        slots.inbox = bp.add(q);
        return slots;
      },
      {
        inbox: any(
          AwsSqsQueue,
          queueRegion === undefined ? {} : {region: queueRegion},
        ),
        ...Object.fromEntries(
          topics.map(t => [
            t.id,
            any(AwsSnsTopic, t.region === undefined ? {} : {region: t.region}),
          ]),
        ),
      },
    );

  it('refuses a queue subscribing to two topics', () => {
    expect(() => queue([{id: 'a'}])).not.toThrow();
    expect(() => queue([{id: 'a'}, {id: 'b'}])).toThrow(
      /'inbox' .* depends on 2 Messaging\.PaaS\.AwsSnsTopic components \[a, b\]/,
    );
  });

  it('refuses a queue subscribing to a topic of another region', () => {
    expect(() =>
      queue([{id: 'a', region: 'us-east-1'}], 'eu-central-1'),
    ).toThrow(
      /is in region eu-central-1 but subscribes to topic 'a' in region us-east-1/,
    );
  });

  it('refuses a Service Bus topic without a namespace', () => {
    expect(() =>
      build(bp => ({t: bp.add(MessagingEntity({id: 't'}))}), {
        t: any(AzureServiceBusTopic),
      }),
    ).toThrow(/'t' .* has no Messaging\.PaaS\.AzureServiceBus dependency/);
  });
});

// ── Big data ─────────────────────────────────────────────────────────────────
describe('Databricks components live in a workspace of their cloud', () => {
  const cluster = (workspace: Offer | undefined) =>
    build(
      bp => {
        const ws = bp.add(DistributedDataProcessing({id: 'ws'}));
        const node = ComputeCluster({id: 'spark'});
        return {
          ws,
          spark: bp.add(workspace === undefined ? node : node.dependsOn(ws)),
        };
      },
      {ws: workspace ?? any(AwsDatabricks), spark: any(AwsDatabricksCluster)},
    );

  it('refuses a cluster without a workspace, or with one of another cloud', () => {
    expect(() => cluster(any(AwsDatabricks))).not.toThrow();
    expect(() => cluster(undefined)).toThrow(
      /'spark' .* has no BigData\.PaaS\.AwsDatabricks dependency/,
    );
    expect(() => cluster(any(GcpDatabricks))).toThrow(
      /has no BigData\.PaaS\.AwsDatabricks dependency/,
    );
  });
});

// ── Gateways ─────────────────────────────────────────────────────────────────
describe('workload routes through a TraefikGateway', () => {
  const routed = (
    gateway: Record<string, unknown>,
    links: (
      bp: {link: (s: AnyNode, t: AnyNode, x?: Record<string, unknown>) => void},
      n: Record<string, AnyNode>,
    ) => void,
  ) =>
    build(
      bp => {
        const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
        const gw = bp.add(ApiGateway({id: 'gw'}).dependsOn(cluster));
        const a = bp.add(
          Workload({id: 'a'}).withImage('registry/a:1').dependsOn(cluster),
        );
        const b = bp.add(
          Workload({id: 'b'}).withImage('registry/b:1').dependsOn(cluster),
        );
        const nodes = {cluster, gw, a, b};
        links(bp, nodes);
        return nodes;
      },
      {
        cluster: any(Eks),
        gw: any(TraefikGateway, gateway),
        a: any(K8sWorkload),
        b: any(K8sWorkload),
      },
    );
  const route = (prefix: string, host?: string) =>
    gatewayRouteSettings({
      routes: [host === undefined ? {prefix} : {prefix, host}],
    });

  it('refuses a route link without routes', () => {
    expect(() =>
      routed({host: 'api.example.com'}, (bp, n) => bp.link(n.a, n.gw, {})),
    ).toThrow(/Route link from 'a' to 'gw': the link has no routes/);
  });

  it('refuses a route without a host when the gateway has none', () => {
    expect(() =>
      routed({}, (bp, n) => bp.link(n.a, n.gw, route('/a'))),
    ).toThrow(
      /route \/a has no host, and the gateway publishes no default host/,
    );
    expect(() =>
      routed({}, (bp, n) => bp.link(n.a, n.gw, route('/a', 'api.example.com'))),
    ).not.toThrow();
  });

  it('refuses two workloads claiming overlapping routes', () => {
    expect(() =>
      routed({host: 'api.example.com'}, (bp, n) => {
        bp.link(n.a, n.gw, route('/accounts'));
        bp.link(n.b, n.gw, route('/accounts/admin'));
      }),
    ).toThrow(
      /Route link from 'a' to 'gw': route api\.example\.com\/accounts overlaps route api\.example\.com\/accounts\/admin of 'b'/,
    );
    expect(() =>
      routed({host: 'api.example.com'}, (bp, n) => {
        bp.link(n.a, n.gw, route('/'));
        bp.link(n.b, n.gw, route('/api'));
      }),
    ).not.toThrow();
    expect(() =>
      routed({host: 'api.example.com'}, (bp, n) => {
        bp.link(n.a, n.gw, route('/api'));
        bp.link(n.b, n.gw, route('/api', 'admin.example.com'));
      }),
    ).not.toThrow();
  });

  it('refuses a gateway with no cluster', () => {
    expect(() =>
      build(bp => ({gw: bp.add(ApiGateway({id: 'gw'}))}), {
        gw: any(TraefikGateway),
      }),
    ).toThrow(
      /'gw' \(APIManagement\.CaaS\.TraefikGateway\) runs on Kubernetes but no Kubernetes cluster/,
    );
  });
});

describe('a CloudFront site needs an origin', () => {
  it('refuses aliases with no bucket, gateway or originDomain', () => {
    const cdn = (config: Record<string, unknown>) =>
      build(bp => ({cdn: bp.add(ApiGateway({id: 'cdn'}))}), {
        cdn: any(AwsCloudFront, {region: 'us-east-1', ...config}),
      });
    expect(() =>
      cdn({
        aliases: ['www.example.com'],
        acmCertificateArn: 'arn:aws:acm:us-east-1:1:certificate/x',
      }),
    ).toThrow(/a site serving www\.example\.com needs an origin/);
    expect(() =>
      cdn({
        aliases: ['www.example.com'],
        acmCertificateArn: 'arn:aws:acm:us-east-1:1:certificate/x',
        originDomain: 'origin.example.com',
      }),
    ).not.toThrow();
  });
});

describe('databases a DBMS emits as its children', () => {
  const withChild = (settings: Record<string, unknown>) =>
    createFractal({
      id: 'child-databases',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {name: 'rules'},
      blueprint: bp => {
        const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
        const dbms = bp.add(RelationalDbms({id: 'dbms'}));
        const api = bp.add(
          Workload({id: 'api'}).withImage('registry/api:1').dependsOn(cluster),
        );
        return {cluster, dbms, api};
      },
      operations: (s, ctx) => ({
        withOrders: () => {
          const orders = RelationalDatabase({id: 'orders'});
          const add = s.dbms.addChild(orders);
          const link = ctx.link(s.api, orders, settings);
          return st => link(add(st));
        },
      }),
    })
      .specialize()
      .withOrders()
      .toLiveSystem({
        name: 'rules',
        environment: {},
        select: {
          cluster: Eks({}),
          dbms: AwsRdsPostgresDbms({}),
          api: K8sWorkload({}),
        },
      });

  it('checks the links to a child database like a selected one', () => {
    expect(() => withChild({access: 'read-write'})).not.toThrow();
    expect(() => withChild({})).toThrow(
      /Link from 'api' to 'orders' \(Storage\.PaaS\.AwsRdsPostgresDatabase\): declares no database access/,
    );
  });
});
