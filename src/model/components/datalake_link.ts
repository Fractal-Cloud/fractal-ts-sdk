/**
 * Settings shape for a link from a `DataProcessingJob` to a `Datalake`: "I read
 * from / write to this lake for the given purpose". The agent hands the job the
 * matching lake URI at runtime (`LAKE_RAW_URI`, `LAKE_CURATED_URI` or
 * `LAKE_CHECKPOINT_URI`). A job may link to several lakes, one purpose per link.
 * Use with the generic `bp.link` / operation `link`:
 *
 *   bp.link(job, lake, {purpose: 'raw', path: 'sales'} satisfies DatalakeLink);
 *
 * The lake's URI is not carried on the link: the lake publishes it as an output
 * field and the agent injects it into the job.
 */
export type DatalakeLink = {
  /** The role the lake plays for the job. Required, with no default.
   *  - `raw`: the ingestion zone the job reads incoming data from.
   *  - `curated`: where the job writes processed outputs.
   *  - `checkpoint`: where a streaming job keeps its state. */
  purpose: 'raw' | 'curated' | 'checkpoint';
  /** Sub-path inside the lake for this purpose, without a leading slash
   *  (e.g. `sales/orders`). The job receives `<lake URI>/<path>`; unset, it
   *  receives the root of the lake. */
  path?: string;
};
