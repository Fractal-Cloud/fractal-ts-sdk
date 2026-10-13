/**
 * security.test.ts — executable spec for the Security domain.
 *
 * Authors a vendor-agnostic Fractal (ServiceMesh + IdentityProvider) with
 * security guardrails (mTLS mode, MFA, password policy), exposes a dev-open
 * operation, then specializes and selects offers to build a LiveSystem. Proves:
 * guardrails are locked, the live component type/provider is driven by offer
 * selection (vendor-neutral CaaS offers carry no provider; cloud offers do),
 * the catalogue is future-proof (swap an IdP offer with no fractal change), and
 * a wrong offer is rejected at compile time AND at runtime.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {
  ServiceMesh,
  IdentityProvider,
  IdentityProviderClientLink,
} from './components/security';
import {Ocelot, Cognito, Keycloak, EntraExternalId} from './offers/security';
import {Workload} from './components/custom_workloads';
import {ContainerPlatform} from './components/network_and_compute';
import {Eks} from './offers/network_and_compute';

const environment = {};
const boundedContextId = {id: 'security-templates'};

// Ocelot reads none of the mesh guardrails (mTLS, authentication mode, tags),
// so the Live Systems below that select it use a mesh without them.
function authorFractal(meshGuardrails = true) {
  const mesh = ServiceMesh({id: 'app-mesh'});
  return createFractal({
    id: 'standard-security',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      // A self-hosted mesh is installed on the cluster it depends on.
      const platform = bp.add(ContainerPlatform({id: 'platform'}));
      const meshNode = bp.add(
        (meshGuardrails
          ? mesh
              .withMtlsMode('strict')
              .withAuthenticationMode('jwt')
              .withTags({team: 'platform'})
          : mesh
        ).dependsOn(platform),
      );
      const idp = bp.add(
        IdentityProvider({id: 'app-idp'})
          .withPasswordPolicy({minLength: 12})
          .withMfaConfiguration('ON')
          .withSessionDuration(3600),
      );
      return {platform, mesh: meshNode, idp};
    },
    operations: s => ({
      // dev-open neutral param: userDirectoryName is NOT a locked guardrail.
      withUserDirectory: (v: string) => s.idp.set('userDirectoryName', v),
    }),
  });
}

describe('Security domain', () => {
  it('Ocelot refuses the mesh guardrails its agent cannot apply', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'acme',
        environment,
        select: {
          platform: Eks({}),
          'app-mesh': Ocelot({host: 'auth.example.com'}),
          'app-idp': Cognito({}),
        },
      }),
    ).toThrow(
      "Offer Security.CaaS.Ocelot cannot honor the parameter 'authenticationMode' of 'app-mesh'",
    );
  });

  it('blueprint records guardrails (tags array) and locks them', () => {
    const mesh = authorFractal().blueprint.components.find(
      c => c.id === 'app-mesh',
    )!;
    expect(mesh.parameters.tags).toEqual({team: 'platform'});
    expect(mesh.parameters.mtlsMode).toBe('strict');
    expect(mesh.locked).toContain('mtlsMode');

    const idp = authorFractal().blueprint.components.find(
      c => c.id === 'app-idp',
    )!;
    expect(idp.parameters.passwordPolicy).toEqual({minLength: 12});
    expect(idp.parameters.mfaConfiguration).toBe('ON');
    expect(idp.locked).toContain('mfaConfiguration');
  });

  it('a locked guardrail cannot be overridden by a dev op', () => {
    // mfaConfiguration is locked; attempting to set it must throw.
    const f = authorFractal();
    expect(() => f.specialize().value).not.toThrow();
    // The dev-open op (userDirectoryName) is allowed because it is NOT locked.
    expect(() =>
      authorFractal().specialize().withUserDirectory('acme'),
    ).not.toThrow();
  });

  it('LiveSystem: vendor-neutral mesh offer carries no provider; cloud IdP does', () => {
    const ls = authorFractal(false)
      .specialize()
      .withUserDirectory('acme')
      .toLiveSystem({
        name: 'acme-security',
        environment,
        select: {
          platform: Eks({}),
          'app-mesh': Ocelot({}),
          'app-idp': Cognito({}),
        },
      });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['app-mesh'].type).toBe('Security.CaaS.Ocelot');
    expect(byId['app-mesh'].provider).toBeUndefined();
    expect(byId['app-idp'].type).toBe('Security.PaaS.AwsCognito');
    expect(byId['app-idp'].provider).toBe('AWS');
    // the IdP guardrails reach Cognito under its own keys
    expect(byId['app-idp'].parameters.mfaConfiguration).toBe('ON');
    // dev-open op value flowed in
    expect(byId['app-idp'].parameters.userDirectoryName).toBe('acme');
  });

  it('future-proof: swapping the IdP offer needs no fractal change', () => {
    const ls = authorFractal(false)
      .specialize()
      .withUserDirectory('acme')
      .toLiveSystem({
        name: 'acme-security',
        environment,
        select: {
          platform: Eks({}),
          'app-mesh': Ocelot({}),
          'app-idp': Keycloak({}),
        },
      });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['app-idp'].type).toBe('Security.CaaS.Keycloak');
    expect(byId['app-idp'].provider).toBeUndefined();
  });

  it('selecting a wrong offer for the mesh is a type error AND throws', () => {
    expect(() =>
      authorFractal().toLiveSystem({
        name: 'x',
        environment,
        select: {
          platform: Eks({}),
          // @ts-expect-error Cognito (IdentityProvider) cannot satisfy Security.ServiceMesh
          'app-mesh': Cognito({}),
          'app-idp': Cognito({}),
        },
      }),
    ).toThrow(/does not satisfy/);
  });

  it('Azure Entra External ID satisfies the same IdP blueprint (no fractal change)', () => {
    const ls = authorFractal(false)
      .specialize()
      .withUserDirectory('acme')
      .toLiveSystem({
        name: 'acme-security',
        environment,
        select: {
          platform: Eks({}),
          'app-mesh': Ocelot({}),
          'app-idp': EntraExternalId({
            tenantName: 'acmeexternal',
            resourceGroup: 'acme-rg',
          }),
        },
      });

    const byId = Object.fromEntries(ls.components.map(c => [c.id, c]));
    expect(byId['app-idp'].type).toBe('Security.PaaS.AzureEntraExternalId');
    expect(byId['app-idp'].provider).toBe('Azure');
    // vendor plumbing from the offer config
    expect(byId['app-idp'].parameters.tenantName).toBe('acmeexternal');
    expect(byId['app-idp'].parameters.resourceGroup).toBe('acme-rg');
    // the SAME agnostic guardrail flows in — proves the blueprint is unchanged
    expect(byId['app-idp'].parameters.mfaConfiguration).toBe('ON');
  });

  it('a workload links to the IdP — one app client per link', () => {
    const f = createFractal({
      id: 'app-with-idp',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const idp = bp.add(
          IdentityProvider({id: 'app-idp'}).withMfaConfiguration('ON'),
        );
        const web = bp.add(Workload({id: 'web'}).withImage('acme/web:1'));
        // The workload declares one app client on the IdP via the link.
        bp.link(web, idp, {
          clientType: 'web',
          redirectUris: ['https://app.acme/callback'],
          scopes: ['openid', 'profile'],
        } satisfies IdentityProviderClientLink);
        return {idp, web};
      },
    });

    const web = f.blueprint.components.find(c => c.id === 'web')!;
    expect(web.links).toEqual([
      {
        componentId: 'app-idp',
        settings: {
          clientType: 'web',
          redirectUris: ['https://app.acme/callback'],
          scopes: ['openid', 'profile'],
        },
      },
    ]);
  });
});
