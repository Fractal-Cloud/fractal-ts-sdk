/**
 * links.test.ts — proves the blueprint link mechanism (bp.link).
 *
 * Links are authored in the blueprint (architect owns structure) and serialize
 * to the agent wire contract `{componentId, settings}`:
 *   - security-group / network-policy MEMBERSHIP: a link with empty settings.
 *   - traffic rule: a link carrying fromPort/toPort/protocol settings.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {
  VirtualNetwork,
  Subnet,
  SecurityGroup,
  VirtualMachine,
} from './components/network_and_compute';
import {
  AwsVpc,
  AwsSubnet,
  AwsSecurityGroup,
  Ec2Instance,
} from './offers/network_and_compute';

const environment = {name: 'dev'};
const boundedContextId = {name: 'reusable-templates'};

function authorFractal() {
  return createFractal({
    id: 'linked-iaas',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const network = bp.add(
        VirtualNetwork({id: 'main-network'}).withCidrBlock('10.0.0.0/16'),
      );
      const subnet = bp.add(
        Subnet({id: 'public-subnet'})
          .withCidrBlock('10.0.1.0/24')
          .dependsOn(network),
      );
      const sg = bp.add(
        SecurityGroup({id: 'web-sg'})
          .withIngressRules([
            {fromPort: 22, toPort: 22, sourceCidr: '0.0.0.0/0'},
          ])
          .dependsOn(network),
      );
      const api = bp.add(VirtualMachine({id: 'api'}).dependsOn(subnet));
      const web = bp.add(VirtualMachine({id: 'web'}).dependsOn(subnet));

      // Membership links (no settings) + a traffic-rule link (settings).
      bp.link(api, sg);
      bp.link(web, sg);
      bp.link(web, api, {fromPort: 8080, toPort: 8080, protocol: 'tcp'});

      return {network, subnet, sg, api, web};
    },
  });
}

describe('blueprint links', () => {
  it('serialize the blueprint with {componentId, settings} links', () => {
    const bp = authorFractal().blueprint;
    const web = bp.components.find(c => c.id === 'web')!;
    expect(web.links).toEqual([
      {componentId: 'web-sg', settings: {}},
      {
        componentId: 'api',
        settings: {fromPort: 8080, toPort: 8080, protocol: 'tcp'},
      },
    ]);
    const api = bp.components.find(c => c.id === 'api')!;
    expect(api.links).toEqual([{componentId: 'web-sg', settings: {}}]);
  });

  it('flow links into the live components (wire contract)', () => {
    const ls = authorFractal().toLiveSystem({
      name: 'acme',
      environment,
      select: {
        'main-network': AwsVpc({}),
        'public-subnet': AwsSubnet({}),
        'web-sg': AwsSecurityGroup({}),
        api: Ec2Instance({amiId: 'ami-1', instanceType: 't3.small'}),
        web: Ec2Instance({amiId: 'ami-1', instanceType: 't3.micro'}),
      },
    });
    const web = ls.components.find(c => c.id === 'web')!;
    expect(web.links).toContainEqual({componentId: 'web-sg', settings: {}});
    expect(web.links).toContainEqual({
      componentId: 'api',
      settings: {fromPort: 8080, toPort: 8080, protocol: 'tcp'},
    });
    // components with no links get an empty array
    const network = ls.components.find(c => c.id === 'main-network')!;
    expect(network.links).toEqual([]);
  });
});
