import {describe, expect, it} from 'vitest';
import {Fractal} from '../index';
import {BoundedContext} from '../../bounded_context';
import {KebabCaseString} from '../../values/kebab_case_string';
import {OwnerId} from '../../values/owner_id';
import {OwnerType} from '../../values/owner_type';
import {Version} from '../../values/version';
import {VirtualNetwork} from '../component/network_and_compute/iaas/virtual_network';
import {AwsVpc} from '../../live_system/component/network_and_compute/iaas/vpc';

const bcId = BoundedContext.Id.getBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(OwnerId.getBuilder().withValue('00000000-0000-0000-0000-000000000001').build())
  .withName(KebabCaseString.getBuilder().withValue('test-bc').build())
  .build();

const fractalId = Fractal.Id.getBuilder()
  .withBoundedContextId(bcId)
  .withName(KebabCaseString.getBuilder().withValue('test-fractal').build())
  .withVersion(Version.getBuilder().withMajor(1).withMinor(0).withPatch(0).build())
  .build();

function validBlueprintComponent() {
  return VirtualNetwork.create({
    id: 'main-vpc',
    version: {major: 1, minor: 0, patch: 0},
    displayName: 'Main VPC',
  }).vpc;
}

describe('Fractal blueprint guard', () => {
  it('should accept a valid blueprint component', () => {
    expect(() =>
      Fractal.getBuilder()
        .withId(fractalId)
        .withComponents([validBlueprintComponent()])
        .build(),
    ).not.toThrow();
  });

  it('should throw when a live system component is added to a Fractal', () => {
    const liveSystemComponent = AwsVpc.create({
      id: 'main-vpc',
      version: {major: 1, minor: 0, patch: 0},
      displayName: 'Main VPC',
      cidrBlock: '10.0.0.0/16',
    });

    expect(() =>
      Fractal.getBuilder()
        .withId(fractalId)
        .withComponents([liveSystemComponent as unknown as Fractal.Component])
        .build(),
    ).toThrow(
      'Live system components cannot be added to a Fractal blueprint.',
    );
  });

  it('should include the component id in the error message', () => {
    const liveSystemComponent = AwsVpc.create({
      id: 'rogue-vpc',
      version: {major: 1, minor: 0, patch: 0},
      displayName: 'Rogue VPC',
      cidrBlock: '10.0.0.0/16',
    });

    expect(() =>
      Fractal.getBuilder()
        .withId(fractalId)
        .withComponents([liveSystemComponent as unknown as Fractal.Component])
        .build(),
    ).toThrow('rogue-vpc');
  });
});
