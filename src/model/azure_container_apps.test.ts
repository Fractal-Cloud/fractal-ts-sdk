/**
 * azure_container_apps.test.ts — executable spec for the Azure Container Apps
 * pair: the managed environment offer and the workload that requires it.
 *
 * The agent resolves the environment as a DEPENDENCY, by offer type, and reads
 * `environmentId` off its output fields. Neither half of that contract was
 * expressible from TypeScript before: there was no environment offer to select,
 * so every Container App this SDK emitted failed in the agent with
 * `has no AzureContainerAppsEnvironment dependency`. These cases pin the emitted
 * type string (the agent dispatches on it) and the author-time refusal.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {Workload} from './components/custom_workloads';
import {AzureContainerApp} from './offers/custom_workloads';
import {ContainerPlatform} from './components/network_and_compute';
import {AzureContainerAppsEnvironment, Aks} from './offers/network_and_compute';

const environment = {};

/** A platform plus one workload that declares it as a dependency. */
const authorFractal = () =>
  createFractal({
    id: 'container-apps-stack',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId: {id: 'container-apps-templates'},
    blueprint: bp => {
      const platform = bp.add(ContainerPlatform({id: 'app-platform'}));
      const api = bp.add(
        Workload({id: 'api-workload'}).dependsOn(platform),
      );
      return {platform, api};
    },
    operations: s => ({
      withApiImage: (v: string) => s.api.set('image', v),
    }),
  });

const deploy = (select: Record<string, unknown>) =>
  authorFractal()
    .specialize()
    .withApiImage('registry/api:1')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .toLiveSystem({name: 'acme-prod', environment, select: select as any});

describe('Azure Container Apps', () => {
  it('the environment emits the offer type the agent dispatches on', () => {
    const ls = deploy({
      'app-platform': AzureContainerAppsEnvironment({
        location: 'westeurope',
        logAnalyticsWorkspaceId: 'ws-1',
        logAnalyticsSharedKey: 'key-1',
      }),
      'api-workload': AzureContainerApp({resourceGroup: 'rg-cp'}),
    });

    const env = ls.components.find(c => c.id === 'app-platform')!;
    // The agent matches the dependency on this exact 3-part string and keys its
    // PaaS handler registry on the third segment. Both are load-bearing.
    expect(env.type).toBe('NetworkAndCompute.PaaS.AzureContainerAppsEnvironment');
    expect(env.provider).toBe('Azure');
    expect(env.deliveryModel).toBe('PaaS');
    // `location`, not `region`: it is the only region key this component reads,
    // and it reaches ARM's `withRegion(...)` unguarded.
    expect(env.parameters.location).toBe('westeurope');
    // Every key emitted must be one `AzureContainerAppsEnvironmentConfig.fromMap`
    // actually reads. Asserting a value we just set proves nothing about the
    // agent; asserting that we emit NOTHING outside its contract catches the
    // failure this offer exists to prevent — a knob the author can set and the
    // agent never looks at. `resourceGroup` is the specific trap: the agent takes
    // its group from the `azureResourceGroup` MAP parameter, so a flat string
    // would read back to the author while provisioning somewhere else.
    expect(Object.keys(env.parameters).sort()).toEqual([
      'location',
      'logAnalyticsSharedKey',
      'logAnalyticsWorkspaceId',
    ]);
  });

  it('the Container App keeps the environment as a dependency', () => {
    const ls = deploy({
      'app-platform': AzureContainerAppsEnvironment({location: 'westeurope'}),
      'api-workload': AzureContainerApp({resourceGroup: 'rg-cp'}),
    });

    const api = ls.components.find(c => c.id === 'api-workload')!;
    expect(api.type).toBe('CustomWorkloads.PaaS.AzureContainerApp');
    expect(api.dependencies).toContain('app-platform');
  });

  it('refuses a Container App whose platform is not a Container Apps environment', () => {
    // Aks satisfies the same Component, so this selection type-checks — exactly
    // the mistake the sample made, and the one the agent only caught mid-deploy.
    expect(() =>
      deploy({
        'app-platform': Aks({}),
        'api-workload': AzureContainerApp({resourceGroup: 'rg-cp'}),
      }),
    ).toThrow(/has no NetworkAndCompute\.PaaS\.AzureContainerAppsEnvironment dependency/);
  });

  it('refuses a Container App that depends on nothing at all', () => {
    const fractal = createFractal({
      id: 'lonely-container-app',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId: {id: 'container-apps-templates'},
      blueprint: bp => ({api: bp.add(Workload({id: 'api-workload'}))}),
      operations: () => ({}),
    });

    expect(() =>
      fractal.specialize().toLiveSystem({
        name: 'acme-prod',
        environment,
        select: {'api-workload': AzureContainerApp({resourceGroup: 'rg-cp'})},
      }),
    ).toThrow(/An Azure Container App can only run inside a managed environment/);
  });
});
