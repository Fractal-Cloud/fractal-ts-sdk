/**
 * An app Live System that runs on a shared EKS cluster owned by ops.
 *
 * The ops team deployed the Live System `shared-eks` in the Bounded Context
 * `fractal-cloud-platform`; its EKS cluster is the component `eks`. The app's
 * Fractal still declares a `ContainerPlatform`, but instead of selecting an
 * offer that would create a second cluster, the app fills that slot with
 * `referenceTo(...)`, pointing at the ops-owned cluster.
 */
import {
  createFractal,
  ContainerPlatform,
  Workload,
  Eks,
  K8sWorkload,
  liveSystemIdOf,
  referenceTo,
} from '@fractal_cloud/sdk';

// References work only inside one organization, so a single id serves both teams.
const organizationId = process.env['ORGANIZATION_ID']!;

// Builds the control-plane id of the ops Live System:
// `Organizational/<organizationId>/fractal-cloud-platform/shared-eks`.
const sharedEks = liveSystemIdOf(
  {
    ownerType: 'Organizational',
    ownerId: organizationId,
    name: 'fractal-cloud-platform',
  },
  'shared-eks',
);

export const ordersService = createFractal({
  id: 'orders-service',
  version: {major: 1, minor: 0, patch: 0},
  // The app's own Bounded Context. It may differ from the target's.
  boundedContextId: {
    ownerType: 'Organizational',
    ownerId: organizationId,
    name: 'orders',
  },
  blueprint: bp => {
    const cluster = bp.add(ContainerPlatform({id: 'cluster'}));
    const api = bp.add(
      Workload({id: 'orders-api'})
        .withImage('ghcr.io/acme/orders-api:1.4.2')
        .withPort(8080)
        // The dependency names the LOCAL id `cluster`, never `eks`.
        .dependsOn(cluster),
    );
    return {cluster, api};
  },
});

export const ordersLiveSystem = ordersService.specialize().toLiveSystem({
  name: 'orders',
  // Must be the environment the shared cluster runs in.
  environment: {
    ownerType: 'Organizational',
    ownerId: organizationId,
    name: 'prod',
  },
  select: {
    // `Eks` names the target's offer. It must satisfy the slot's Component, just
    // as an ordinary selection must. Its configuration is never sent.
    cluster: referenceTo(Eks, {liveSystemId: sharedEks, componentId: 'eks'}),
    'orders-api': K8sWorkload({namespace: 'orders'}),
  },
});
