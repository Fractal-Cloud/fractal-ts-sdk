/**
 * basic_security.test.ts
 *
 * Smoke test for the Security ServiceMesh capability under the migrated
 * Fractal + Interface model. The comprehensive provider-selection,
 * dependency/link inheritance and serialization coverage lives in
 * security_servicemesh.test.ts; this file just proves the basic authoring →
 * LiveSystem path resolves the Ocelot offer on CaaS.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {ServiceMesh} from '../fractal/component/security/caas/service_mesh';
import {Ocelot} from '../live_system/component/security/caas/ocelot';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';

const kebab = (v: string) => KebabCaseString.getBuilder().withValue(v).build();

const ownerId = OwnerId.getBuilder()
  .withValue('00000000-0000-0000-0000-000000000001')
  .build();

const boundedContextId = getBoundedContextIdBuilder()
  .withOwnerType(OwnerType.Personal)
  .withOwnerId(ownerId)
  .withName(kebab('reusable-templates'))
  .build();

const environment = getEnvironmentBuilder()
  .withId(
    getEnvironmentIdBuilder()
      .withOwnerType(OwnerType.Personal)
      .withOwnerId(ownerId)
      .withName(kebab('test'))
      .build(),
  )
  .build();

function authorServiceMeshFractal() {
  return createFractal({
    id: 'service-mesh',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed service mesh',
    boundedContextId,
    blueprint: bp => ({
      mesh: bp.add(
        ServiceMesh.create({
          id: 'service-mesh',
          displayName: 'Service Mesh',
          offers: [Ocelot],
        }),
      ),
    }),
    operations: () => ({}),
  });
}

describe('basic_security ServiceMesh', () => {
  it('serializes the ServiceMesh Service onto the blueprint', () => {
    const mesh = authorServiceMeshFractal().blueprint.components.find(
      c => c.id.toString() === 'service-mesh',
    )!;
    expect(mesh.displayName).toBe('Service Mesh');
    const serviceTypes = (mesh.services ?? []).map(s => s.type.toString());
    expect(serviceTypes).toEqual(['Security.CaaS.ServiceMesh']);
  });

  it('resolves to the Ocelot offer on CaaS', () => {
    const ls = authorServiceMeshFractal().toLiveSystem({
      name: 'acme-mesh',
      environment,
      provider: 'CaaS',
    });
    const mesh = ls.components.find(c => c.id.toString() === 'service-mesh')!;
    expect(mesh.type.toString()).toBe('Security.CaaS.Ocelot');
    expect(mesh.provider).toBe('CaaS');
  });
});
