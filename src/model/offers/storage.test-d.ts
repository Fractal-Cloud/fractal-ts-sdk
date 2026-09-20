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
import {GcpMySqlDbms} from './storage';

/**
 * `network` is required on this offer's config where the PostgreSQL one omits it. It is the one
 * parameter the GCP agent refuses to default — `GcpDatabaseInstance.getFromComponent` throws
 * `Network parameter is missing` on a blank value, and the published contract marks it
 * `required: true` — so an author who cannot supply it here has no route to it at all, and the
 * create call fails cloud-side. Relaxing this to `network?: string` to match the PostgreSQL offer
 * reintroduces exactly that hole; these directives turn that into a compile error.
 */
// @ts-expect-error `network` is required: an empty config must not typecheck.
GcpMySqlDbms({});

// @ts-expect-error `network` is required: supplying only the optional keys must not typecheck.
GcpMySqlDbms({instanceTier: 'db-perf-optimized-N-4'});

// Positive control: with `network` supplied, the same call typechecks. Without this, the two
// directives above would also be satisfied by an offer that rejects every config.
GcpMySqlDbms({network: 'acme-vpc', instanceTier: 'db-perf-optimized-N-4'});
