/**
 * Type-level assertions for the storage offers' config types. These are compile-time only:
 * nothing here runs, and nothing here is reachable from `src/index.ts` or `src/model/index.ts`, so
 * tsdown does not bundle it.
 *
 * It is NOT in `children.test.ts` for a load-bearing reason: `tsconfig.json` excludes
 * `**&#47;*.test.ts`, so `npm run typecheck` — the `tsc --noEmit` that `npm test` runs first — never
 * looks at a test file. A `@ts-expect-error` written in one is inert, which is why several already
 * in this repo's tests are unused directives that no check reports. `.test-d.ts` does not match that
 * exclusion, so these assertions are checked by the command that already gates the suite.
 */
import {
  AwsRdsMySqlDatabase,
  AwsRdsMySqlDbms,
  AwsRdsPostgresDbms,
  GcpMySqlDbms,
} from './storage';

/**
 * `network` is OPTIONAL on this offer's config, matching the PostgreSQL one.
 *
 * It was required until the agent learned to derive it. Both halves of the old justification are
 * now false at the source, which is why these assertions are inverted rather than merely relaxed:
 *
 *   - the runtime no longer demands it. `GcpDatabaseInstance.getFromComponent` reads the component
 *     parameter first and, when it is blank, falls back to `CloudSqlNetworkFallback` — the
 *     environment's spoke network, which `GcpInfrastructureComponent` resolves for every GCP
 *     component before any parameter of this Offer is read;
 *   - the published contract no longer marks it `required: true`. `GcpMySqlInstantiatorStrategy`
 *     declares `ParamSpec.derived(NETWORK_PARAM_KEY, "string", "defaults to the environment's spoke
 *     network when absent")`.
 *
 * Requiring it here now costs an author the ordinary case — a Cloud SQL instance in the
 * environment's own project, where the spoke network is exactly the right answer — to buy nothing.
 */
// An empty config must typecheck: the agent derives the network.
GcpMySqlDbms({});

// Supplying only the optional keys must typecheck, for the same reason.
GcpMySqlDbms({instanceTier: 'db-perf-optimized-N-4'});

/**
 * An author-supplied `network` must still typecheck, and is not merely decorative: the component
 * parameter wins over the derived fallback, and it is the ONLY route for a component whose
 * `projectId` overrides the environment's — `CloudSqlNetworkFallback.forComponent` refuses to
 * derive across projects and directs the author to supply this key.
 */
GcpMySqlDbms({network: 'acme-vpc', instanceTier: 'db-perf-optimized-N-4'});

// Negative control. Without it, the assertions above would also be satisfied by a config type that
// accepts anything at all, which is the failure mode relaxing a required key invites.
// @ts-expect-error `tier` is not a key of this config — the agent reads `instanceTier`.
GcpMySqlDbms({tier: 'db-perf-optimized-N-4'});

// ── Amazon RDS for MySQL: the PostgreSQL offer's vocabulary, key for key ──────
AwsRdsMySqlDbms({});
AwsRdsMySqlDbms({mode: 'aurora-serverless', version: '8.4', port: 3306});
AwsRdsMySqlDatabase({});
AwsRdsMySqlDatabase({databaseName: 'strapi'});
// @ts-expect-error MySQL has no schema below a database.
AwsRdsMySqlDatabase({schema: 'public'});
// @ts-expect-error `engineVersion` is not a key of this config — the agent reads `version`.
AwsRdsMySqlDbms({engineVersion: '8.4'});

// `cloudwatchLogExports` is optional on both RDS DBMS offers, and a list of log types.
AwsRdsPostgresDbms({cloudwatchLogExports: ['postgresql', 'upgrade']});
AwsRdsMySqlDbms({cloudwatchLogExports: ['error', 'slowquery']});
// @ts-expect-error a single log type is still a list.
AwsRdsMySqlDbms({cloudwatchLogExports: 'error'});

// `requireSecureTransport` is optional on both RDS DBMS offers, and a boolean.
AwsRdsPostgresDbms({requireSecureTransport: true});
AwsRdsMySqlDbms({requireSecureTransport: false});
// @ts-expect-error a string is not a boolean, even 'true'.
AwsRdsPostgresDbms({requireSecureTransport: 'true'});
