/**
 * aws_cloudfront_s3_origin.test.ts — executable spec for `AwsCloudFront` serving a
 * static site from an S3 bucket:
 *   - the bucket is the origin when the distribution LINKS to an `AwsS3` component
 *     with the object-storage link `{access: 'read'}` (the ObjectStorageLink
 *     contract, read-only): the agent grants the distribution alone through an
 *     origin access control, and the bucket stays private;
 *   - a bucket link is one of the distribution's origins, exclusive with a linked
 *     gateway, `originDomain` and `redirectTo`;
 *   - `defaultRootObject` and `spaFallback` apply to a bucket origin only, and are
 *     sent only when set.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {ApiGateway} from './components/api_management';
import {ObjectStorage, type ObjectStorageLink} from './components/storage';
import {AwsCloudFront, TraefikGateway} from './offers/api_management';
import {AwsS3} from './offers/storage';
import {liveSystemIdOf, referenceTo} from './reference';

const environment = {};
const boundedContextId = {name: 'platform'};

type CloudFrontConfig = Parameters<typeof AwsCloudFront>[0];

/** The region the sites' bucket is declared in. */
const BUCKET_REGION = 'eu-west-1';

/** A site: a bucket and a distribution, linked with `access` (no link when null). */
const site = (access: string | null) =>
  createFractal({
    id: 'site',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => {
      const content = bp.add(ObjectStorage({id: 'content'}));
      const cdn = bp.add(ApiGateway({id: 'cdn'}));
      if (access !== null) {
        bp.link(cdn, content, {access});
      }
      return {content, cdn};
    },
  });

const cdnOf = (config: CloudFrontConfig, access: string | null = 'read') =>
  site(access)
    .toLiveSystem({
      name: 'site',
      environment,
      select: {content: AwsS3({region: BUCKET_REGION}), cdn: AwsCloudFront(config)},
    })
    .components.find(c => c.id === 'cdn')!;

describe('AwsCloudFront — static site from an S3 bucket', () => {
  it('serves aliases from the linked bucket, with the site settings it was given', () => {
    const cdn = cdnOf({
      aliases: ['docs.example.com'],
      defaultRootObject: 'index.html',
      spaFallback: true,
    });

    expect(cdn.type).toBe('APIManagement.PaaS.AwsCloudFront');
    expect(cdn.links).toEqual([
      {componentId: 'content', settings: {access: 'read'}},
    ]);
    expect(cdn.dependencies).toEqual([]);
    expect(cdn.parameters).toEqual({
      aliases: ['docs.example.com'],
      defaultRootObject: 'index.html',
      spaFallback: true,
    });
  });

  it('sends no site setting that was not set', () => {
    expect(cdnOf({aliases: ['docs.example.com']}).parameters).toEqual({
      aliases: ['docs.example.com'],
    });
  });

  it('sends errorDocument only when set, for a classic static site', () => {
    expect(
      cdnOf({aliases: ['docs.example.com'], errorDocument: '404.html'}).parameters,
    ).toEqual({aliases: ['docs.example.com'], errorDocument: '404.html'});
    expect(
      cdnOf({aliases: ['docs.example.com'], errorDocument: '404.html', spaFallback: false})
        .parameters,
    ).toEqual({aliases: ['docs.example.com'], errorDocument: '404.html', spaFallback: false});
  });

  it('accepts a read-write link: the distribution is granted read only', () => {
    expect(() => cdnOf({aliases: ['a.example.com']}, 'read-write')).not.toThrow();
  });

  it('accepts a distribution declared in the bucket\'s own region', () => {
    expect(() =>
      cdnOf({aliases: ['a.example.com'], region: BUCKET_REGION}),
    ).not.toThrow();
  });

  it('refuses a bucket link carrying any key besides access', () => {
    const f = createFractal({
      id: 'site',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const content = bp.add(ObjectStorage({id: 'content'}));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, content, {access: 'read', accessMode: 'read'});
        return {content, cdn};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'site',
        environment,
        select: {
          content: AwsS3({}),
          cdn: AwsCloudFront({aliases: ['a.example.com']}),
        },
      }),
    ).toThrow(/accessMode.*'access' only/);
  });

  it('accepts spaFallback false anywhere: it declares nothing', () => {
    expect(() =>
      cdnOf({originDomain: 'o.example.com', spaFallback: false}, null),
    ).not.toThrow();
  });

  it('sends an explicit spaFallback false', () => {
    expect(
      cdnOf({aliases: ['docs.example.com'], spaFallback: false}).parameters,
    ).toEqual({aliases: ['docs.example.com'], spaFallback: false});
  });

  it('serves a bucket without aliases (the distribution domain only)', () => {
    // spaFallback is refused without a bucket origin, so this proves the bucket is the origin.
    expect(cdnOf({spaFallback: true}).parameters).toEqual({spaFallback: true});
  });

  it('takes the link settings from the ObjectStorageLink contract', () => {
    const f = createFractal({
      id: 'site',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const content = bp.add(ObjectStorage({id: 'content'}));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, content, {access: 'read'} satisfies ObjectStorageLink);
        return {content, cdn};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'site',
        environment,
        select: {
          content: AwsS3({}),
          cdn: AwsCloudFront({aliases: ['a.example.com']}),
        },
      }),
    ).not.toThrow();
  });

  it('serves a bucket that another Live System owns, through a reference', () => {
    const ls = site('read').toLiveSystem({
      name: 'site',
      environment,
      select: {
        content: referenceTo(AwsS3, {
          liveSystemId: liveSystemIdOf(
            {ownerType: 'Organizational', ownerId: 'org', name: 'platform'},
            'shared-storage',
          ),
          componentId: 'site-bucket',
        }),
        cdn: AwsCloudFront({aliases: ['a.example.com']}),
      },
    });
    expect(ls.components.find(c => c.id === 'cdn')!.links).toEqual([
      {componentId: 'content', settings: {access: 'read'}},
    ]);
  });

  it.each([
    ['a write link', {aliases: ['a.example.com']}, 'write', /reads it/],
    ['a blank access', {aliases: ['a.example.com']}, '', /declares no 'access'/],
    [
      'an unknown access',
      {aliases: ['a.example.com']},
      'readonly',
      /must be read, write or read-write/,
    ],
    [
      'a bucket together with originDomain',
      {aliases: ['a.example.com'], originDomain: 'o.example.com'},
      'read',
      /exactly one origin/,
    ],
    [
      'a bucket together with redirectTo',
      {aliases: ['a.example.com'], redirectTo: 'https://x.example.com'},
      'read',
      /redirectTo or an origin, not both/,
    ],
    [
      'a defaultRootObject with a leading slash',
      {aliases: ['a.example.com'], defaultRootObject: '/index.html'},
      'read',
      /defaultRootObject/,
    ],
    [
      'a blank defaultRootObject',
      {aliases: ['a.example.com'], defaultRootObject: ' '},
      'read',
      /defaultRootObject/,
    ],
    [
      'a defaultRootObject longer than 255 characters',
      {aliases: ['a.example.com'], defaultRootObject: 'a'.repeat(256)},
      'read',
      /defaultRootObject/,
    ],
    [
      'a defaultRootObject with surrounding spaces',
      {aliases: ['a.example.com'], defaultRootObject: ' index.html'},
      'read',
      /defaultRootObject/,
    ],
    [
      'a bucket together with redirectTo, without aliases',
      {redirectTo: 'https://x.example.com'},
      'read',
      /redirectTo or an origin, not both/,
    ],
    [
      'site keys with no origin at all',
      {defaultRootObject: 'index.html'},
      null,
      /defaultRootObject .* bucket/,
    ],
    [
      'a spaFallback that is not a boolean',
      {aliases: ['a.example.com'], spaFallback: 'yes'},
      'read',
      /spaFallback/,
    ],
    [
      'defaultRootObject without a bucket origin',
      {originDomain: 'o.example.com', defaultRootObject: 'index.html'},
      null,
      /defaultRootObject .* bucket/,
    ],
    [
      'spaFallback without a bucket origin',
      {originDomain: 'o.example.com', spaFallback: true},
      null,
      /spaFallback .* bucket/,
    ],
    [
      'errorDocument without a bucket origin',
      {originDomain: 'o.example.com', errorDocument: '404.html'},
      null,
      /errorDocument .* bucket/,
    ],
    [
      'errorDocument on a redirect',
      {redirectTo: 'https://x.example.com', errorDocument: '404.html'},
      null,
      /errorDocument .* bucket/,
    ],
    [
      'defaultRootObject in origin mode (no aliases, no linked origin)',
      {defaultRootObject: 'index.html'},
      null,
      /defaultRootObject .* bucket/,
    ],
    [
      'errorDocument together with spaFallback',
      {aliases: ['a.example.com'], errorDocument: '404.html', spaFallback: true},
      'read',
      /errorDocument .* spaFallback|spaFallback .* errorDocument/,
    ],
    [
      'an errorDocument with a leading slash',
      {aliases: ['a.example.com'], errorDocument: '/404.html'},
      'read',
      /errorDocument/,
    ],
    [
      'a blank errorDocument',
      {aliases: ['a.example.com'], errorDocument: ' '},
      'read',
      /errorDocument/,
    ],
    [
      'an errorDocument climbing out with ..',
      {aliases: ['a.example.com'], errorDocument: 'a/../404.html'},
      'read',
      /errorDocument/,
    ],
    [
      'a defaultRootObject with a character outside letters, digits and ._/-',
      {aliases: ['a.example.com'], defaultRootObject: 'index page.html'},
      'read',
      /defaultRootObject/,
    ],
    [
      'a bucket in another region than the distribution',
      {aliases: ['a.example.com'], region: 'eu-central-1'},
      'read',
      /region/,
    ],
  ])('refuses %s', (_why, config, access, reason) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => cdnOf(config as any, access)).toThrow(reason);
  });

  it('refuses a link with no settings at all', () => {
    const f = createFractal({
      id: 'site',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const content = bp.add(ObjectStorage({id: 'content'}));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, content);
        return {content, cdn};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'site',
        environment,
        select: {
          content: AwsS3({}),
          cdn: AwsCloudFront({aliases: ['a.example.com']}),
        },
      }),
    ).toThrow(/declares no 'access'/);
  });

  it('refuses a bucket together with a linked gateway', () => {
    const f = createFractal({
      id: 'site',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const content = bp.add(ObjectStorage({id: 'content'}));
        const traefik = bp.add(ApiGateway({id: 'traefik'}));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, content, {access: 'read'});
        bp.link(cdn, traefik);
        return {content, traefik, cdn};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'site',
        environment,
        select: {
          content: AwsS3({}),
          traefik: TraefikGateway({}),
          cdn: AwsCloudFront({aliases: ['a.example.com']}),
        },
      }),
    ).toThrow(/exactly one origin/);
  });

  it('refuses two buckets', () => {
    const f = createFractal({
      id: 'site',
      version: {major: 1, minor: 0, patch: 0},
      boundedContextId,
      blueprint: bp => {
        const a = bp.add(ObjectStorage({id: 'a'}));
        const b = bp.add(ObjectStorage({id: 'b'}));
        const cdn = bp.add(ApiGateway({id: 'cdn'}));
        bp.link(cdn, a, {access: 'read'});
        bp.link(cdn, b, {access: 'read'});
        return {a, b, cdn};
      },
    });
    expect(() =>
      f.toLiveSystem({
        name: 'site',
        environment,
        select: {
          a: AwsS3({}),
          b: AwsS3({}),
          cdn: AwsCloudFront({aliases: ['a.example.com']}),
        },
      }),
    ).toThrow(/links to 2 buckets \[a, b\]: at most one/);
  });
});
