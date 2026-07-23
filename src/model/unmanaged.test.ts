/**
 * unmanaged.test.ts — the two new consumer link surfaces:
 *   - VM → ObjectStorage (access-grant link)
 *   - VM → Unmanaged (config + secret-ref injection), incl. the generic
 *     `Unmanaged` component and its `AI.SaaS.Unmanaged` offer.
 *
 * Proves the links serialize to the agent wire contract `{componentId, settings}`
 * and that the Unmanaged offer resolves to a vendor-neutral SaaS live component.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {VirtualMachine} from './components/network_and_compute';
import {ObjectStorage, type ObjectStorageLink} from './components/storage';
import {Unmanaged, type UnmanagedLink} from './components/unmanaged';
import {GcpVm} from './offers/network_and_compute';
import {GcsBucket} from './offers/storage';
import {UnmanagedAi} from './offers/unmanaged';
import {secretRef} from './secret';

const environment = {name: 'dev'};
const boundedContextId = {name: 'reusable-templates'};

function authorFractal() {
  return createFractal({
    id: 'gpu-eval',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const vm = bp.add(VirtualMachine({id: 'eval-box'}));
      const bucket = bp.add(ObjectStorage({id: 'results-bucket'}));
      const openai = bp.add(Unmanaged({id: 'openai'}));

      // Access-grant + inject links (the new consumer-link surfaces).
      bp.link(vm, bucket, {access: 'read-write'} satisfies ObjectStorageLink);
      bp.link(vm, openai, {envPrefix: 'OPENAI'} satisfies UnmanagedLink);

      return {vm, bucket, openai};
    },
  });
}

describe('Unmanaged component + VM access/inject links', () => {
  it('serializes VM→ObjectStorage and VM→Unmanaged links on the blueprint', () => {
    const vm = authorFractal().blueprint.components.find(
      c => c.id === 'eval-box',
    )!;
    expect(vm.links).toEqual([
      {componentId: 'results-bucket', settings: {access: 'read-write'}},
      {componentId: 'openai', settings: {envPrefix: 'OPENAI'}},
    ]);
  });

  it('resolves the AI.SaaS.Unmanaged offer as a vendor-neutral SaaS component', () => {
    const ls = authorFractal().toLiveSystem({
      name: 'acme',
      environment,
      select: {
        'eval-box': GcpVm({machineType: 'a2-highgpu-1g'}),
        'results-bucket': GcsBucket({region: 'europe-west1'}),
        // Secret is referenced by short name — the raw key never travels.
        openai: UnmanagedAi({secret: secretRef('openai-api-key')}),
      },
    });
    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));

    expect(byId['openai'].type).toBe('AI.SaaS.Unmanaged');
    expect(byId['openai'].deliveryModel).toBe('SaaS');
    // External third party — no cloud provider (like MinIO).
    expect(byId['openai'].provider).toBeUndefined();
    // The secret is a reference to an env secret, not a raw value.
    expect(byId['openai'].parameters.secret).toEqual({
      $envSecret: 'openai-api-key',
    });

    // The access-grant + inject links survive into the live VM component.
    expect(byId['eval-box'].links).toContainEqual({
      componentId: 'results-bucket',
      settings: {access: 'read-write'},
    });
    expect(byId['eval-box'].links).toContainEqual({
      componentId: 'openai',
      settings: {envPrefix: 'OPENAI'},
    });
  });

  it('carries an env-secret reference in a link setting', () => {
    // A link setting may reference an env secret by short name; the raw value
    // never travels — the agent resolves the reference at link-resolution time.
    const f = createFractal({
      id: 'link-secret',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const vm = bp.add(VirtualMachine({id: 'box'}));
        const svc = bp.add(Unmanaged({id: 'svc'}));
        bp.link(vm, svc, {token: secretRef('svc-token')});
        return {vm, svc};
      },
    });
    const box = f.blueprint.components.find(c => c.id === 'box')!;
    expect(box.links).toEqual([
      {componentId: 'svc', settings: {token: {$envSecret: 'svc-token'}}},
    ]);
  });
});
