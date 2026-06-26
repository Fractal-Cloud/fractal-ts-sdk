/**
 * customworkloads_function.test.ts
 *
 * M8 migration proof for the CustomWorkloads "Function" capability under the
 * Fractal + Interface model. Mirrors samples/workload_fractal.test.ts and
 * samples/messaging_broker.test.ts:
 *
 *   - An infra team authors ONE Fractal whose Function abstract component carries
 *     the candidate Offers (AwsLambda/AWS, AzureFunction/Azure,
 *     GoogleFunction/GCP).
 *   - A dev specializes through the Interface only with vendor-neutral keys
 *     (sourceArtifact, packageType, runtime, environment), never naming a vendor
 *     offer.
 *   - The Provider chosen at LiveSystem time selects the offer. Swapping the
 *     provider changes only the offer `type`/`provider`; the neutral params,
 *     declared dependencies and links flow through identically.
 *   - None of the Function offers emit vendor sub-components.
 *   - `toLiveSystem(...)` returns a real, validated LiveSystem.
 *   - The Blueprint serializes the candidate offers onto its Service.
 *   - An unknown provider throws `No Function offer ...`.
 */

import {describe, expect, it} from 'vitest';
import {createFractal} from '../fractal/create_fractal';
import {
  Function,
  SOURCE_ARTIFACT_PARAM,
  PACKAGE_TYPE_PARAM,
  RUNTIME_PARAM,
  ENVIRONMENT_PARAM,
} from '../fractal/component/custom_workloads/faas/function';
import {AwsLambda} from '../live_system/component/custom_workloads/faas/aws_lambda';
import {AzureFunction} from '../live_system/component/custom_workloads/faas/azure_function';
import {GoogleFunction} from '../live_system/component/custom_workloads/faas/gcp_google_function';
import {KebabCaseString} from '../values/kebab_case_string';
import {OwnerType} from '../values/owner_type';
import {OwnerId} from '../values/owner_id';
import {getBoundedContextIdBuilder} from '../bounded_context/id';
import {getEnvironmentBuilder} from '../environment/entity';
import {getEnvironmentIdBuilder} from '../environment/id';
import {getComponentIdBuilder} from '../component/id';
import {getLinkBuilder} from '../component/link';
import {getComponentTypeBuilder} from '../component/type';
import {InfrastructureDomain} from '../values/infrastructure_domain';
import {PascalCaseString} from '../values/pascal_case_string';
import {getParametersInstance} from '../values/generic_parameters';
import {LiveSystemComponent} from '../live_system/component';

// ── fixtures ─────────────────────────────────────────────────────────────────

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

// A dependency and a link the abstract component declares — both must be
// inherited by whichever offer the provider selects.
const declaredDependencyId = getComponentIdBuilder()
  .withValue(kebab('some-prerequisite'))
  .build();

const declaredLink = getLinkBuilder()
  .withId(getComponentIdBuilder().withValue(kebab('linked-queue')).build())
  .withType(
    getComponentTypeBuilder()
      .withInfrastructureDomain(InfrastructureDomain.Messaging)
      .withName(PascalCaseString.getBuilder().withValue('LinkedQueue').build())
      .build(),
  )
  .withParameters(getParametersInstance())
  .build();

// ── Infra team: author the Fractal once. ─────────────────────────────────────
function authorFunctionFractal() {
  return createFractal({
    id: 'function-fractal',
    version: {major: 1, minor: 0, patch: 0},
    description: 'Governed serverless function',
    boundedContextId,
    blueprint: bp => ({
      fn: bp.add(
        Function.create({
          id: 'fn',
          displayName: 'Serverless Function',
          offers: [AwsLambda, AzureFunction, GoogleFunction],
          dependencies: [{id: declaredDependencyId}],
          links: [declaredLink],
        }),
      ),
    }),
    operations: bp => ({
      withSourceArtifact: (artifact: string) =>
        bp.fn.set(SOURCE_ARTIFACT_PARAM, artifact),
      withPackageType: (packageType: string) =>
        bp.fn.set(PACKAGE_TYPE_PARAM, packageType),
      withRuntime: (runtime: string) => bp.fn.set(RUNTIME_PARAM, runtime),
      withEnvironment: (environment: Record<string, string>) =>
        bp.fn.set(ENVIRONMENT_PARAM, environment),
    }),
  });
}

// ── Dev team: specialize through the Interface, offer-free. ──────────────────
function specialize(provider: LiveSystemComponent.Provider) {
  const fractal = authorFunctionFractal();
  fractal.operations.withSourceArtifact('registry.acme.io/checkout-fn:1.4.2');
  fractal.operations.withPackageType('image');
  fractal.operations.withRuntime('python3.12');
  fractal.operations.withEnvironment({LOG_LEVEL: 'info'});
  return fractal.toLiveSystem({name: 'acme-fn', environment, provider});
}

describe('Function Fractal — provider-driven offer swap', () => {
  it('selects a different offer type/provider for each provider from one authored Fractal', () => {
    const cases: Array<[LiveSystemComponent.Provider, string]> = [
      ['AWS', 'CustomWorkloads.FaaS.AwsLambda'],
      ['Azure', 'CustomWorkloads.FaaS.AzureFunction'],
      ['GCP', 'CustomWorkloads.FaaS.GoogleFunction'],
    ];

    for (const [provider, expectedType] of cases) {
      const ls = specialize(provider);
      const fn = ls.components.find(c => c.id.toString() === 'fn')!;
      expect(fn).toBeDefined();
      expect(fn.type.toString()).toBe(expectedType);
      expect(fn.provider).toBe(provider);
      // No vendor sub-components for any of these offers.
      expect(ls.components.length).toBe(1);
    }
  });

  it('flows identical neutral params, declared deps and links to whichever offer the provider selects', () => {
    const aws = specialize('AWS').components.find(
      c => c.id.toString() === 'fn',
    )!;
    const azure = specialize('Azure').components.find(
      c => c.id.toString() === 'fn',
    )!;
    const gcp = specialize('GCP').components.find(
      c => c.id.toString() === 'fn',
    )!;

    // neutral params set via the interface — identical across providers
    for (const fn of [aws, azure, gcp]) {
      expect(fn.parameters.getOptionalFieldByName(SOURCE_ARTIFACT_PARAM)).toBe(
        'registry.acme.io/checkout-fn:1.4.2',
      );
      expect(fn.parameters.getOptionalFieldByName(PACKAGE_TYPE_PARAM)).toBe(
        'image',
      );
      expect(fn.parameters.getOptionalFieldByName(RUNTIME_PARAM)).toBe(
        'python3.12',
      );
      expect(fn.parameters.getOptionalFieldByName(ENVIRONMENT_PARAM)).toEqual({
        LOG_LEVEL: 'info',
      });
    }

    // declared dependency + link inherited by every offer
    for (const fn of [aws, azure, gcp]) {
      expect(
        fn.dependencies.some(d => d.id.toString() === 'some-prerequisite'),
      ).toBe(true);
      expect(fn.links.some(l => l.id.toString() === 'linked-queue')).toBe(true);
    }
  });

  it('toLiveSystem returns a real, validated LiveSystem', () => {
    const ls = specialize('AWS');
    expect(typeof ls.deploy).toBe('function');
    expect(ls.fractalId.toString()).toContain('function-fractal');
    expect(ls.environment).toBeDefined();
    expect(ls.genericProvider).toBe('AWS');
  });

  it('serializes candidate offers onto the Blueprint component Service', () => {
    const blueprint = authorFunctionFractal().blueprint;
    const fn = blueprint.components.find(c => c.id.toString() === 'fn')!;

    expect(fn.services).toBeDefined();
    // All three offers share the FaaS delivery model → one Service.
    const serviceTypes = fn.services!.map(s => s.type.toString()).sort();
    expect(serviceTypes).toEqual(['CustomWorkloads.FaaS.Function']);

    const offerTypes = fn
      .services!.flatMap(s => s.offers)
      .map(o => o.type.toString())
      .sort();
    expect(offerTypes).toEqual([
      'CustomWorkloads.FaaS.AwsLambda',
      'CustomWorkloads.FaaS.AzureFunction',
      'CustomWorkloads.FaaS.GoogleFunction',
    ]);
  });

  it('throws when no candidate offer matches the requested provider', () => {
    const fractal = authorFunctionFractal();
    expect(() =>
      fractal.toLiveSystem({
        name: 'acme-fn',
        environment,
        provider: 'OCI' as never,
      }),
    ).toThrow(/No Function offer/);
  });
});
