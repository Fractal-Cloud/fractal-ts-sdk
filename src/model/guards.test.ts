/**
 * guards.test.ts — toLiveSystem validation guards.
 *
 * Covers the review-hardening cases:
 *  - an offer that does not emit an app-added child throws (no silent drop);
 *  - an unknown `select` key (e.g. a typo'd component id) throws.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ObjectStorage, RelationalDatabase} from './components/storage';
import {AwsS3} from './offers/storage';

const environment = {name: 'dev'};
const boundedContextId = {name: 'reusable-templates'};

describe('toLiveSystem guards', () => {
  it('throws when the selected offer drops an app-added child component', () => {
    // ObjectStorage's offer (AwsS3) uses the default instantiate and does NOT
    // emit children — adding a child under it must fail loudly.
    const fractal = createFractal({
      id: 'g',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({bucket: bp.add(ObjectStorage({id: 'bucket'}))}),
      operations: s => ({
        addOrphan: () => s.bucket.addChild(RelationalDatabase({id: 'orphan'})),
      }),
    });
    expect(() =>
      fractal
        .specialize()
        .addOrphan()
        .toLiveSystem({
          name: 'x',
          environment,
          select: {bucket: AwsS3({bucketRegion: 'us-east-1'})},
        }),
    ).toThrow(/does not emit its child/);
  });

  it('throws on an unknown selection key (typo)', () => {
    const fractal = createFractal({
      id: 'g2',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => ({bucket: bp.add(ObjectStorage({id: 'bucket'}))}),
    });
    expect(() =>
      fractal.toLiveSystem({
        name: 'x',
        environment,
        select: {
          bucket: AwsS3({bucketRegion: 'us-east-1'}),
          // @ts-expect-error 'buckets' is not a component in this fractal
          buckets: AwsS3({bucketRegion: 'us-east-1'}),
        },
      }),
    ).toThrow(/does not match any component/);
  });
});
