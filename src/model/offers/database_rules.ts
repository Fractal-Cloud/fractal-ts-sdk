/**
 * offers/database_rules.ts — what a relational database needs from the rest of
 * its Live System: the DBMS it lives on, and links that say what each consumer
 * is granted.
 *
 * A database is checked both when it is selected on its own and when a DBMS
 * offer emits it as a child (`withDatabases`), so each DBMS offer runs these
 * on the databases it emits. Internal.
 */
import type {ComponentValidator} from './component_validator';
import {
  allOf,
  dependenciesOfType,
  inboundLinks,
  refuseComponent,
  settingText,
} from './cross_component_rules';
import {databaseLinksDeclareAccess} from './link_setting_rules';

/**
 * A database lives on the DBMS it depends on, of its own engine and cloud: the
 * agent refuses a database without one ("a database cannot exist without the
 * server that hosts it").
 */
export const databaseRules = (
  dbmsTypes: readonly string[],
  dbmsOffer: string,
): ComponentValidator =>
  allOf((self, all) => {
    if (dependenciesOfType(self, all, dbmsTypes).length === 0) {
      refuseComponent(
        self,
        `has no ${dbmsTypes[0]} dependency: a database cannot exist without the server ` +
          `that hosts it. Add it under a RelationalDbms with ${dbmsOffer} selected ` +
          '(withDatabases), or make it depend on one',
      );
    }
  }, databaseLinksDeclareAccess);

const CONNECTION_STRING_TYPES = ['jdbc', 'npgsql', 'postgres-url'];

/**
 * A Cloud SQL database treats every dependency as the Cloud SQL instance it is
 * created on, so it may depend on nothing else; a consumer's link may choose
 * the `connectionStringType` it is given.
 */
export const gcpDatabaseRules = (
  dbmsTypes: readonly string[],
): ComponentValidator =>
  allOf(databaseRules(dbmsTypes, 'GcpPostgresDbms'), (self, all) => {
    const others = self.dependencies.filter(
      id => !dependenciesOfType(self, all, dbmsTypes).some(c => c.id === id),
    );
    if (others.length > 0) {
      refuseComponent(
        self,
        `depends on [${others.join(', ')}], which are not Cloud SQL instances: a Cloud SQL ` +
          'database reads every dependency as the instance it is created on. Keep only ' +
          'the dependency on its DBMS',
      );
    }
    for (const {source, link} of inboundLinks(self, all)) {
      const type = settingText(link.settings, 'connectionStringType');
      if (type !== '' && !CONNECTION_STRING_TYPES.includes(type)) {
        refuseComponent(
          self,
          `is linked from '${source.id}' with connectionStringType '${type}'; it must be ` +
            CONNECTION_STRING_TYPES.join(', '),
        );
      }
    }
  });

/**
 * Two MySQL databases on one DBMS whose ids differ only by case derive one
 * database name, and the agent refuses the second. Either sets `databaseName`
 * to have its own. A referenced DBMS scopes names by Live System, so it is not
 * checked.
 */
export const mysqlDatabaseNamesDistinct =
  (databaseType: string, dbmsTypes: readonly string[]): ComponentValidator =>
  (self, all) => {
    const named = (c: {parameters: Record<string, unknown>}) =>
      settingText(c.parameters, 'databaseName') !== '';
    if (named(self)) {
      return;
    }
    for (const dbms of dependenciesOfType(self, all, dbmsTypes)) {
      if (dbms.reference !== undefined) {
        continue;
      }
      const clash = all.find(
        c =>
          c.id !== self.id &&
          c.type === databaseType &&
          !named(c) &&
          c.dependencies.includes(dbms.id) &&
          c.id.toLowerCase() === self.id.toLowerCase(),
      );
      if (clash !== undefined) {
        refuseComponent(
          self,
          `would be the same database on DBMS '${dbms.id}' as '${clash.id}': ids that ` +
            "differ only by case derive one name. Set 'databaseName' on one of them",
        );
      }
    }
  };

/**
 * The subnets an RDS DBMS declares become its DB subnet group, which must lie
 * in one VPC and span at least two Availability Zones. Without declared
 * subnets the agent places the DBMS itself, so nothing is checked.
 */
export const rdsDbmsSubnets =
  (subnetType: string, vpcTypes: readonly string[]): ComponentValidator =>
  (self, all) => {
    const subnets = dependenciesOfType(self, all, [subnetType]);
    if (subnets.length === 0) {
      return;
    }
    const vpcs = new Set(
      subnets.flatMap(s => dependenciesOfType(s, all, vpcTypes).map(v => v.id)),
    );
    if (vpcs.size > 1) {
      refuseComponent(
        self,
        `declares subnets in more than one VPC [${[...vpcs].join(', ')}]: a DB subnet ` +
          'group cannot span VPCs. Declare subnets of one VPC',
      );
    }
    const zones = subnets.map(s =>
      settingText(s.parameters, 'availabilityZone'),
    );
    const known = zones.every(z => z !== '');
    if (subnets.length < 2 || (known && new Set(zones).size < 2)) {
      refuseComponent(
        self,
        `declares subnets in only one Availability Zone [${subnets.map(s => s.id).join(', ')}]: ` +
          'RDS requires at least two. Declare subnets in two zones, or none to let the ' +
          'agent place it across the environment spoke',
      );
    }
  };
