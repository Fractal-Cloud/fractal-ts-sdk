import {getLiveSystemComponentBuilder} from '../../entity';
import {getBlueprintComponentTypeBuilder} from '../../../../fractal/component/type';
import {InfrastructureDomain} from '../../../../values/infrastructure_domain';
import {ServiceDeliveryModel} from '../../../../values/service_delivery_model';
import {PascalCaseString} from '../../../../values/pascal_case_string';
import {
  GenericParameters,
  getParametersInstance,
} from '../../../../values/generic_parameters';
import {getComponentIdBuilder, ComponentId} from '../../../../component/id';
import {KebabCaseString} from '../../../../values/kebab_case_string';
import {getVersionBuilder, Version} from '../../../../values/version';
import {LiveSystemComponent} from '../../index';
import {BlueprintComponent} from '../../../../fractal/component/index';

const CAAS_K8S_WORKLOAD_TYPE_NAME = 'K8sDeployment';
const REPLICAS_PARAM = 'replicas';
const CONTAINER_IMAGE_PARAM = 'containerImage';
const CONTAINER_PORT_PARAM = 'containerPort';
const CPU_PARAM = 'cpu';
const MEMORY_PARAM = 'memory';

// OCI artifact URI carrying a `.fractal/` bundle (Deployment / StatefulSet /
// DaemonSet manifests + fractal-parameters.yml). Optional. When set, the
// caas-k8s agent fetches the bundle, applies the manifest matching the
// component's id, then overlays SDK-derived fields on top. When unset, the
// agent generates a Deployment from SDK params alone. See
// fractal-docs/getting-started/manifests-as-oci-artifacts.mdx for the
// full dev-side contract.
const MANIFEST_URI_PARAM = 'manifestUri';

function buildId(id: string): ComponentId {
  return getComponentIdBuilder()
    .withValue(KebabCaseString.getBuilder().withValue(id).build())
    .build();
}

function buildVersion(major: number, minor: number, patch: number): Version {
  return getVersionBuilder()
    .withMajor(major)
    .withMinor(minor)
    .withPatch(patch)
    .build();
}

function buildType() {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(CAAS_K8S_WORKLOAD_TYPE_NAME)
        .build(),
    )
    .build();
}

function pushParam(
  params: GenericParameters,
  key: string,
  value: unknown,
): void {
  params.push(key, value as Record<string, object>);
}

export type SatisfiedCaaSK8sWorkloadBuilder = {
  withReplicas: (replicas: number) => SatisfiedCaaSK8sWorkloadBuilder;
  /**
   * OCI artifact URI carrying a `.fractal/` bundle.
   *
   * Format: `<registry>/<repo>:<tag>` or `<registry>/<repo>@sha256:<digest>`.
   * The bundle must contain `<componentId>-fdeploy.yaml` for this workload
   * and a `fractal-parameters.yml` with an entry whose `name` matches the
   * LiveSystem's environment short-name. SDK-derived fields (replicas,
   * containerImage, etc.) overlay onto whichever workload-shaped doc the
   * bundle declares (Deployment, StatefulSet, DaemonSet, ...).
   *
   * Optional. When omitted, the agent generates a Deployment from SDK
   * params alone. There is intentionally no default location — devs name
   * artifacts however they want.
   */
  withManifestUri: (uri: string) => SatisfiedCaaSK8sWorkloadBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSK8sWorkloadBuilder = {
  withId: (id: string) => CaaSK8sWorkloadBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => CaaSK8sWorkloadBuilder;
  withDisplayName: (displayName: string) => CaaSK8sWorkloadBuilder;
  withDescription: (description: string) => CaaSK8sWorkloadBuilder;
  withContainerImage: (image: string) => CaaSK8sWorkloadBuilder;
  withContainerPort: (port: number) => CaaSK8sWorkloadBuilder;
  withCpu: (cpu: string) => CaaSK8sWorkloadBuilder;
  withMemory: (memory: string) => CaaSK8sWorkloadBuilder;
  withReplicas: (replicas: number) => CaaSK8sWorkloadBuilder;
  /** See SatisfiedCaaSK8sWorkloadBuilder.withManifestUri. */
  withManifestUri: (uri: string) => CaaSK8sWorkloadBuilder;
  build: () => LiveSystemComponent;
};

export type CaaSK8sWorkloadConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  containerImage?: string;
  containerPort?: number;
  cpu?: string;
  memory?: string;
  replicas?: number;
  /** OCI artifact URI of the `.fractal/` bundle. See builder docs. */
  manifestUri?: string;
};

export namespace CaaSK8sWorkload {
  export const getBuilder = (): CaaSK8sWorkloadBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS');

    const builder: CaaSK8sWorkloadBuilder = {
      withId: id => {
        inner.withId(buildId(id));
        return builder;
      },
      withVersion: (major, minor, patch) => {
        inner.withVersion(buildVersion(major, minor, patch));
        return builder;
      },
      withDisplayName: dn => {
        inner.withDisplayName(dn);
        return builder;
      },
      withDescription: d => {
        inner.withDescription(d);
        return builder;
      },
      withContainerImage: v => {
        pushParam(params, CONTAINER_IMAGE_PARAM, v);
        return builder;
      },
      withContainerPort: v => {
        pushParam(params, CONTAINER_PORT_PARAM, v);
        return builder;
      },
      withCpu: v => {
        pushParam(params, CPU_PARAM, v);
        return builder;
      },
      withMemory: v => {
        pushParam(params, MEMORY_PARAM, v);
        return builder;
      },
      withReplicas: v => {
        pushParam(params, REPLICAS_PARAM, v);
        return builder;
      },
      withManifestUri: v => {
        pushParam(params, MANIFEST_URI_PARAM, v);
        return builder;
      },
      build: () => inner.build(),
    };
    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedCaaSK8sWorkloadBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('CaaS')
      .withId(buildId(blueprint.id.toString()))
      .withVersion(
        buildVersion(
          blueprint.version.major,
          blueprint.version.minor,
          blueprint.version.patch,
        ),
      )
      .withDisplayName(blueprint.displayName)
      .withDependencies(blueprint.dependencies)
      .withLinks(blueprint.links);

    if (blueprint.description) {
      inner.withDescription(blueprint.description);
    }

    // Carry blueprint parameters
    for (const key of [
      CONTAINER_IMAGE_PARAM,
      CONTAINER_PORT_PARAM,
      CPU_PARAM,
      MEMORY_PARAM,
    ]) {
      const val = blueprint.parameters.getOptionalFieldByName(key);
      if (val !== null) {
        pushParam(params, key, val);
      }
    }

    const desiredCount =
      blueprint.parameters.getOptionalFieldByName('desiredCount');
    if (desiredCount !== null) {
      pushParam(params, REPLICAS_PARAM, desiredCount);
    }

    const satisfiedBuilder: SatisfiedCaaSK8sWorkloadBuilder = {
      withReplicas: v => {
        pushParam(params, REPLICAS_PARAM, v);
        return satisfiedBuilder;
      },
      withManifestUri: v => {
        pushParam(params, MANIFEST_URI_PARAM, v);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };
    return satisfiedBuilder;
  };

  export const create = (
    config: CaaSK8sWorkloadConfig,
  ): LiveSystemComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName);
    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.containerImage) {
      b.withContainerImage(config.containerImage);
    }
    if (config.containerPort !== undefined) {
      b.withContainerPort(config.containerPort);
    }
    if (config.cpu) {
      b.withCpu(config.cpu);
    }
    if (config.memory) {
      b.withMemory(config.memory);
    }
    if (config.replicas !== undefined) {
      b.withReplicas(config.replicas);
    }
    if (config.manifestUri) {
      b.withManifestUri(config.manifestUri);
    }
    return b.build();
  };
}
