import {getBlueprintComponentBuilder} from '../../entity';
import {
  getBlueprintComponentTypeBuilder,
  BlueprintComponentType,
} from '../../type';
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
import {BlueprintComponent} from '../../index';
import {getLinkBuilder} from '../../../../component/link';
import {SecurityGroupComponent} from '../../network_and_compute/iaas/security_group';
import {CaaSApiGatewayComponent} from '../../api_management/caas/api_gateway';

export const WORKLOAD_TYPE_NAME = 'Workload';
export const CONTAINER_IMAGE_PARAM = 'containerImage';
export const CONTAINER_PORT_PARAM = 'containerPort';
export const CONTAINER_NAME_PARAM = 'containerName';
export const CPU_PARAM = 'cpu';
export const MEMORY_PARAM = 'memory';
export const DESIRED_COUNT_PARAM = 'desiredCount';
export const ENV_PARAM = 'env';
export const ENV_FROM_PARAM = 'envFrom';
export const SECRET_MOUNTS_PARAM = 'secretMounts';
export const IMAGE_PULL_SECRETS_PARAM = 'imagePullSecrets';
export const RESOURCE_REQUESTS_PARAM = 'resourceRequests';
export const RESOURCE_LIMITS_PARAM = 'resourceLimits';
export const SERVICE_ACCOUNT_PARAM = 'serviceAccount';

const API_GATEWAY_TYPE_NAME = 'APIGateway';

// ── internal helpers ──────────────────────────────────────────────────────────

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

function buildWorkloadType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.CustomWorkloads)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(WORKLOAD_TYPE_NAME).build(),
    )
    .build();
}

function buildApiGatewayType(): BlueprintComponentType {
  return getBlueprintComponentTypeBuilder()
    .withInfrastructureDomain(InfrastructureDomain.ApiManagement)
    .withServiceDeliveryModel(ServiceDeliveryModel.CaaS)
    .withName(
      PascalCaseString.getBuilder().withValue(API_GATEWAY_TYPE_NAME).build(),
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

function buildPortLinkParams(
  fromPort: number,
  toPort?: number,
  protocol?: string,
): GenericParameters {
  const p = getParametersInstance();
  p.push('fromPort', fromPort as unknown as Record<string, object>);
  if (toPort !== undefined) {
    p.push('toPort', toPort as unknown as Record<string, object>);
  }
  if (protocol) {
    p.push('protocol', protocol as unknown as Record<string, object>);
  }
  return p;
}

function buildApiGatewayLinkParams(s: ApiGatewayLinkSettings): GenericParameters {
  const p = getParametersInstance();
  p.push('prefix', s.prefix as unknown as Record<string, object>);
  p.push('hostname', s.hostname as unknown as Record<string, object>);
  if (s.rewrite !== undefined) {
    p.push('rewrite', s.rewrite as unknown as Record<string, object>);
  }
  if (s.timeoutMs !== undefined) {
    p.push('timeoutMs', s.timeoutMs as unknown as Record<string, object>);
  }
  if (s.port !== undefined) {
    p.push('port', s.port as unknown as Record<string, object>);
  }
  if (s.tlsSecretName !== undefined) {
    p.push('tlsSecretName', s.tlsSecretName as unknown as Record<string, object>);
  }
  return p;
}

// ── Public API: env / mounts / ingress shapes ─────────────────────────────────

/**
 * Container env var. Either a literal value, or a reference to a key in a
 * ConfigMap or Secret. Settings keys mirror Kubernetes EnvVar/EnvVarSource.
 */
export type WorkloadEnvVar =
  | {name: string; value: string}
  | {name: string; valueFromConfigMap: {name: string; key: string}}
  | {name: string; valueFromSecret: {name: string; key: string}};

export type WorkloadEnvFrom =
  | {configMap: {name: string}}
  | {secret: {name: string}};

/**
 * Mount a Kubernetes Secret as files in the container filesystem.
 * If `items` is omitted every key in the Secret becomes a file at `mountPath/<key>`.
 */
export type WorkloadSecretMount = {
  name: string;            // mount name + Secret name
  mountPath: string;
  items?: {key: string; path: string}[];
  readOnly?: boolean;       // default true
};

export type WorkloadResources = {
  cpu?: string;     // "500m", "1"
  memory?: string;  // "256Mi", "1Gi"
};

/**
 * Settings for a Workload → APIGateway link. The agent that reconciles the
 * APIGateway derives one Mapping (or equivalent) per inbound link from these.
 */
export type ApiGatewayLinkSettings = {
  prefix: string;
  hostname: string;
  rewrite?: string;
  timeoutMs?: number;
  port?: number;
  tlsSecretName?: string;
};

/**
 * Link from one Workload to another, declaring a traffic rule.
 * The agent derives managed SG egress/ingress rules from these.
 */
export type WorkloadPortLink = {
  target: WorkloadComponent;
  fromPort: number;
  toPort?: number;
  protocol?: string;
};

export type WorkloadApiGatewayLink = {
  target: CaaSApiGatewayComponent;
} & ApiGatewayLinkSettings;

export type WorkloadComponent = {
  readonly component: BlueprintComponent;
  readonly components: ReadonlyArray<BlueprintComponent>;
  /** Declares a traffic rule from this workload to another. The agent derives managed SG egress/ingress rules. */
  linkToWorkload: (links: WorkloadPortLink[]) => WorkloadComponent;
  /** Declares SG membership. The agent assigns the workload to the given security group at launch. No settings required. */
  linkToSecurityGroup: (sgs: SecurityGroupComponent[]) => WorkloadComponent;
  /** Declares "expose me through this API Gateway". Settings carry the routing contract (prefix, hostname, rewrite, timeoutMs, port, tlsSecretName). The gateway's agent derives a Mapping/Ingress/etc per link. */
  linkToApiGateway: (links: WorkloadApiGatewayLink[]) => WorkloadComponent;
};

export type WorkloadBuilder = {
  withId: (id: string) => WorkloadBuilder;
  withVersion: (major: number, minor: number, patch: number) => WorkloadBuilder;
  withDisplayName: (displayName: string) => WorkloadBuilder;
  withDescription: (description: string) => WorkloadBuilder;
  withContainerImage: (image: string) => WorkloadBuilder;
  withContainerPort: (port: number) => WorkloadBuilder;
  withContainerName: (name: string) => WorkloadBuilder;
  withCpu: (cpu: string) => WorkloadBuilder;
  withMemory: (memory: string) => WorkloadBuilder;
  withDesiredCount: (count: number) => WorkloadBuilder;
  /** Set environment variables on the container. Repeated calls append. */
  withEnv: (env: WorkloadEnvVar[]) => WorkloadBuilder;
  /** Pull all keys of a ConfigMap or Secret into the container env. Repeated calls append. */
  withEnvFrom: (sources: WorkloadEnvFrom[]) => WorkloadBuilder;
  /** Mount Kubernetes Secrets as files. Repeated calls append. */
  withSecretMounts: (mounts: WorkloadSecretMount[]) => WorkloadBuilder;
  /** Image pull secrets (private registries). */
  withImagePullSecrets: (names: string[]) => WorkloadBuilder;
  /** Resource requests separate from limits. Use `withCpu`/`withMemory` for the back-compat both-equal shorthand. */
  withResourceRequests: (r: WorkloadResources) => WorkloadBuilder;
  withResourceLimits: (r: WorkloadResources) => WorkloadBuilder;
  /** When true, the agent provisions a dedicated ServiceAccount named after the workload. */
  withServiceAccount: (enabled: boolean) => WorkloadBuilder;
  build: () => BlueprintComponent;
};

export type WorkloadConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  containerImage: string;
  containerPort?: number;
  containerName?: string;
  cpu?: string;
  memory?: string;
  desiredCount?: number;
  env?: WorkloadEnvVar[];
  envFrom?: WorkloadEnvFrom[];
  secretMounts?: WorkloadSecretMount[];
  imagePullSecrets?: string[];
  resourceRequests?: WorkloadResources;
  resourceLimits?: WorkloadResources;
  serviceAccount?: boolean;
};

function makeWorkloadComponent(
  component: BlueprintComponent,
): WorkloadComponent {
  return {
    component,
    components: [component],
    linkToWorkload: (links: WorkloadPortLink[]) => {
      const portLinks = links.map(l =>
        getLinkBuilder()
          .withId(l.target.component.id)
          .withType(buildWorkloadType())
          .withParameters(buildPortLinkParams(l.fromPort, l.toPort, l.protocol))
          .build(),
      );
      return makeWorkloadComponent({
        ...component,
        links: [...component.links, ...portLinks],
      });
    },
    linkToSecurityGroup: (sgs: SecurityGroupComponent[]) => {
      const sgLinks = sgs.map(sg =>
        getLinkBuilder()
          .withId(sg.id)
          .withType(sg.type)
          .withParameters(getParametersInstance())
          .build(),
      );
      return makeWorkloadComponent({
        ...component,
        links: [...component.links, ...sgLinks],
      });
    },
    linkToApiGateway: (links: WorkloadApiGatewayLink[]) => {
      const gwLinks = links.map(l =>
        getLinkBuilder()
          .withId(l.target.component.id)
          .withType(buildApiGatewayType())
          .withParameters(buildApiGatewayLinkParams(l))
          .build(),
      );
      return makeWorkloadComponent({
        ...component,
        links: [...component.links, ...gwLinks],
      });
    },
  };
}

export namespace Workload {
  export const getBuilder = (): WorkloadBuilder => {
    const params = getParametersInstance();
    const inner = getBlueprintComponentBuilder()
      .withType(buildWorkloadType())
      .withParameters(params);

    // env / envFrom / secretMounts / imagePullSecrets accumulate so callers
    // can call withEnv() multiple times without losing earlier entries.
    const env: WorkloadEnvVar[] = [];
    const envFrom: WorkloadEnvFrom[] = [];
    const secretMounts: WorkloadSecretMount[] = [];
    const imagePullSecrets: string[] = [];

    const builder: WorkloadBuilder = {
      withId: id => {
        inner.withId(buildId(id));
        return builder;
      },
      withVersion: (major, minor, patch) => {
        inner.withVersion(buildVersion(major, minor, patch));
        return builder;
      },
      withDisplayName: displayName => {
        inner.withDisplayName(displayName);
        return builder;
      },
      withDescription: description => {
        inner.withDescription(description);
        return builder;
      },
      withContainerImage: image => {
        pushParam(params, CONTAINER_IMAGE_PARAM, image);
        return builder;
      },
      withContainerPort: port => {
        pushParam(params, CONTAINER_PORT_PARAM, port);
        return builder;
      },
      withContainerName: name => {
        pushParam(params, CONTAINER_NAME_PARAM, name);
        return builder;
      },
      withCpu: cpu => {
        pushParam(params, CPU_PARAM, cpu);
        return builder;
      },
      withMemory: memory => {
        pushParam(params, MEMORY_PARAM, memory);
        return builder;
      },
      withDesiredCount: count => {
        pushParam(params, DESIRED_COUNT_PARAM, count);
        return builder;
      },
      withEnv: e => {
        env.push(...e);
        pushParam(params, ENV_PARAM, env);
        return builder;
      },
      withEnvFrom: sources => {
        envFrom.push(...sources);
        pushParam(params, ENV_FROM_PARAM, envFrom);
        return builder;
      },
      withSecretMounts: mounts => {
        secretMounts.push(...mounts);
        pushParam(params, SECRET_MOUNTS_PARAM, secretMounts);
        return builder;
      },
      withImagePullSecrets: names => {
        imagePullSecrets.push(...names);
        pushParam(params, IMAGE_PULL_SECRETS_PARAM, imagePullSecrets);
        return builder;
      },
      withResourceRequests: r => {
        pushParam(params, RESOURCE_REQUESTS_PARAM, r);
        return builder;
      },
      withResourceLimits: r => {
        pushParam(params, RESOURCE_LIMITS_PARAM, r);
        return builder;
      },
      withServiceAccount: enabled => {
        pushParam(params, SERVICE_ACCOUNT_PARAM, enabled);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const create = (config: WorkloadConfig): WorkloadComponent => {
    const b = getBuilder()
      .withId(config.id)
      .withVersion(
        config.version.major,
        config.version.minor,
        config.version.patch,
      )
      .withDisplayName(config.displayName)
      .withContainerImage(config.containerImage);

    if (config.description) {
      b.withDescription(config.description);
    }
    if (config.containerPort !== undefined) {
      b.withContainerPort(config.containerPort);
    }
    if (config.containerName) {
      b.withContainerName(config.containerName);
    }
    if (config.cpu) {
      b.withCpu(config.cpu);
    }
    if (config.memory) {
      b.withMemory(config.memory);
    }
    if (config.desiredCount !== undefined) {
      b.withDesiredCount(config.desiredCount);
    }
    if (config.env && config.env.length > 0) {
      b.withEnv(config.env);
    }
    if (config.envFrom && config.envFrom.length > 0) {
      b.withEnvFrom(config.envFrom);
    }
    if (config.secretMounts && config.secretMounts.length > 0) {
      b.withSecretMounts(config.secretMounts);
    }
    if (config.imagePullSecrets && config.imagePullSecrets.length > 0) {
      b.withImagePullSecrets(config.imagePullSecrets);
    }
    if (config.resourceRequests) {
      b.withResourceRequests(config.resourceRequests);
    }
    if (config.resourceLimits) {
      b.withResourceLimits(config.resourceLimits);
    }
    if (config.serviceAccount !== undefined) {
      b.withServiceAccount(config.serviceAccount);
    }

    return makeWorkloadComponent(b.build());
  };
}
