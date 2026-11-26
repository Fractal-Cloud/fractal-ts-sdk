/**
 * datalake_link.test.ts — a DataProcessingJob links to a Datalake with a
 * purpose (and optionally a sub-path), the contract the catalogue publishes as
 * the lake's link properties. The settings travel as written: the link carries
 * no lake URI, the agent injects it.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {Datalake, DataProcessingJob} from './components/big_data';
import type {DatalakeLink} from './components/datalake_link';
import {AzureDatabricksJob, AzureDatalake} from './offers/big_data';

const boundedContextId = {id: 'data-templates'};

const authorFractal = () =>
  createFractal({
    id: 'lake-linked',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const raw = bp.add(Datalake({id: 'rawlake'}));
      const curated = bp.add(Datalake({id: 'curatedlake'}));
      const job = bp.add(DataProcessingJob({id: 'etl-job'}));
      bp.link(job, raw, {purpose: 'raw', path: 'sales'} satisfies DatalakeLink);
      bp.link(job, curated, {purpose: 'curated'} satisfies DatalakeLink);
      return {raw, curated, job};
    },
  });

describe('DataProcessingJob → Datalake link', () => {
  it('records one link per lake with the purpose and path as settings', () => {
    const job = authorFractal().blueprint.components.find(
      c => c.id === 'etl-job',
    )!;
    expect(job.links).toEqual([
      {componentId: 'rawlake', settings: {purpose: 'raw', path: 'sales'}},
      {componentId: 'curatedlake', settings: {purpose: 'curated'}},
    ]);
  });

  it('is not a dependency: the job can exist without the lake', () => {
    const job = authorFractal().blueprint.components.find(
      c => c.id === 'etl-job',
    )!;
    expect(job.dependencies).toEqual([]);
  });

  it('flows unchanged into the live system components', () => {
    const ls = authorFractal()
      .specialize()
      .toLiveSystem({
        name: 'lake-linked',
        environment: {id: 'test-env'},
        select: {
          rawlake: AzureDatalake({}),
          curatedlake: AzureDatalake({}),
          'etl-job': AzureDatabricksJob({}),
        },
      });
    const job = ls.components.find(c => c.id === 'etl-job');
    expect(job?.links).toEqual([
      {componentId: 'rawlake', settings: {purpose: 'raw', path: 'sales'}},
      {componentId: 'curatedlake', settings: {purpose: 'curated'}},
    ]);
  });
});
