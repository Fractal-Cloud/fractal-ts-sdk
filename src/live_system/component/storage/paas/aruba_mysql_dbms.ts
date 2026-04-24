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
import {VERSION_PARAM} from '../../../../fractal/component/storage/paas/relational_dbms';

// Matches aria-agent-aruba handlers/dbaas.go: Storage.PaaS.ArubaMySqlDbms
const ARUBA_MYSQL_DBMS_TYPE_NAME = 'ArubaMySqlDbms';
const FLAVOR_NAME_PARAM = 'flavorName';

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
    .withInfrastructureDomain(InfrastructureDomain.Storage)
    .withServiceDeliveryModel(ServiceDeliveryModel.PaaS)
    .withName(
      PascalCaseString.getBuilder()
        .withValue(ARUBA_MYSQL_DBMS_TYPE_NAME)
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

export type SatisfiedArubaMySqlDbmsBuilder = {
  withFlavorName: (flavorName: string) => SatisfiedArubaMySqlDbmsBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaMySqlDbmsBuilder = {
  withId: (id: string) => ArubaMySqlDbmsBuilder;
  withVersion: (
    major: number,
    minor: number,
    patch: number,
  ) => ArubaMySqlDbmsBuilder;
  withDisplayName: (displayName: string) => ArubaMySqlDbmsBuilder;
  withDescription: (description: string) => ArubaMySqlDbmsBuilder;
  withDbVersion: (version: string) => ArubaMySqlDbmsBuilder;
  withFlavorName: (flavorName: string) => ArubaMySqlDbmsBuilder;
  build: () => LiveSystemComponent;
};

export type ArubaMySqlDbmsConfig = {
  id: string;
  version: {major: number; minor: number; patch: number};
  displayName: string;
  description?: string;
  dbVersion?: string;
  flavorName?: string;
};

export namespace ArubaMySqlDbms {
  export const getBuilder = (): ArubaMySqlDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba');

    const builder: ArubaMySqlDbmsBuilder = {
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
      withDbVersion: value => {
        pushParam(params, VERSION_PARAM, value);
        return builder;
      },
      withFlavorName: value => {
        pushParam(params, FLAVOR_NAME_PARAM, value);
        return builder;
      },
      build: () => inner.build(),
    };

    return builder;
  };

  export const satisfy = (
    blueprint: BlueprintComponent,
  ): SatisfiedArubaMySqlDbmsBuilder => {
    const params = getParametersInstance();
    const inner = getLiveSystemComponentBuilder()
      .withType(buildType())
      .withParameters(params)
      .withProvider('Aruba')
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

    const dbVersion =
      blueprint.parameters.getOptionalFieldByName(VERSION_PARAM);
    if (dbVersion !== null) {
      pushParam(params, VERSION_PARAM, String(dbVersion));
    }

    const satisfiedBuilder: SatisfiedArubaMySqlDbmsBuilder = {
      withFlavorName: value => {
        pushParam(params, FLAVOR_NAME_PARAM, value);
        return satisfiedBuilder;
      },
      build: () => inner.build(),
    };

    return satisfiedBuilder;
  };

  export const create = (config: ArubaMySqlDbmsConfig): LiveSystemComponent => {
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
    if (config.dbVersion) {
      b.withDbVersion(config.dbVersion);
    }
    if (config.flavorName) {
      b.withFlavorName(config.flavorName);
    }

    return b.build();
  };
}
