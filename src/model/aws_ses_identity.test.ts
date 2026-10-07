/**
 * aws_ses_identity.test.ts — executable spec for the `EmailSender` component and
 * the `AwsSesIdentity` offer (agents #829, `Messaging.PaaS.AwsSesIdentity`):
 *
 *   - `AwsSesIdentity` satisfies `Messaging.EmailSender` and emits the agent's
 *     keys, `domain` (required) and `mailFromSubdomain` (optional);
 *   - what the agent would refuse is refused while building the Live System;
 *   - SES production access (agents #831): `productionAccess` and the details
 *     of its request, sent only when set; a request the agent would not send
 *     is refused.
 */
import {describe, it, expect} from 'vitest';
import {createFractal} from './core';
import {EmailSender} from './components/messaging';
import {AwsSesIdentity, AwsSnsTopic} from './offers/messaging';

const OWNER = '00000000-0000-0000-0000-0000000000cc';
const environment = {ownerType: 'Organizational', ownerId: OWNER, name: 'prod'};
const boundedContextId = {
  ownerType: 'Organizational',
  ownerId: OWNER,
  name: 'notifications',
};

const mailer = () =>
  createFractal({
    id: 'mailer',
    version: {major: 1, minor: 0, patch: 0},
    boundedContextId,
    blueprint: bp => ({mail: bp.add(EmailSender({id: 'mail'}))}),
  });

const build = (offer: ReturnType<typeof AwsSesIdentity>) =>
  mailer().toLiveSystem({
    name: 'notifications',
    environment,
    select: {mail: offer},
  });

describe('EmailSender', () => {
  it('is the abstract Messaging.EmailSender component', () => {
    expect(EmailSender({id: 'mail'}).state.component).toBe(
      'Messaging.EmailSender',
    );
  });
});

describe('AwsSesIdentity', () => {
  it('emits the SES identity offer with the domain', () => {
    const [component] = build(
      AwsSesIdentity({domain: 'mail.example.com'}),
    ).components;

    expect(component).toMatchObject({
      id: 'mail',
      type: 'Messaging.PaaS.AwsSesIdentity',
      provider: 'AWS',
      deliveryModel: 'PaaS',
      parameters: {domain: 'mail.example.com'},
    });
    expect(component.parameters).not.toHaveProperty('mailFromSubdomain');
  });

  it('emits the MAIL FROM subdomain when one is given', () => {
    const [component] = build(
      AwsSesIdentity({domain: 'example.com', mailFromSubdomain: 'bounce'}),
    ).components;

    expect(component.parameters).toEqual({
      domain: 'example.com',
      mailFromSubdomain: 'bounce',
    });
  });

  it.each([
    ['', 'empty'],
    ['example', 'one label'],
    ['-bad.example.com', 'a label starting with a hyphen'],
    ['exa mple.com', 'a space'],
    [`${'a'.repeat(64)}.com`, 'a label over 63 characters'],
  ])('refuses the domain %j (%s)', domain => {
    expect(() => build(AwsSesIdentity({domain}))).toThrow(
      /AwsSesIdentity 'mail': domain/,
    );
  });

  it.each([
    ['bounce.mail', 'two labels'],
    ['-bounce', 'a leading hyphen'],
  ])('refuses the MAIL FROM subdomain %j (%s)', mailFromSubdomain => {
    expect(() =>
      build(AwsSesIdentity({domain: 'example.com', mailFromSubdomain})),
    ).toThrow(/AwsSesIdentity 'mail': mailFromSubdomain/);
  });

  // The agent normalizes (trim, lower case, no trailing dot) and reads a blank
  // value as unset, so the SDK accepts what the agent accepts.
  it('accepts a blank MAIL FROM subdomain as unset, as the agent does', () => {
    expect(() =>
      build(AwsSesIdentity({domain: 'example.com', mailFromSubdomain: ''})),
    ).not.toThrow();
    expect(() =>
      build(AwsSesIdentity({domain: 'example.com', mailFromSubdomain: '  '})),
    ).not.toThrow();
  });

  it.each([' Example.COM ', 'example.com.', 'MAIL.example.com'])(
    'accepts the domain %j, which the agent normalizes',
    domain => {
      expect(() =>
        build(AwsSesIdentity({domain, mailFromSubdomain: ' Bounce '})),
      ).not.toThrow();
    },
  );

  it('refuses a MAIL FROM domain longer than a domain name may be', () => {
    const domain = `${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.com`;
    expect(() =>
      build(AwsSesIdentity({domain, mailFromSubdomain: 'bounce'})),
    ).toThrow(/longer than a domain name/);
  });

  it('cannot be selected for another component', () => {
    expect(() =>
      mailer().toLiveSystem({
        name: 'notifications',
        environment,
        // @ts-expect-error an SNS topic does not satisfy Messaging.EmailSender
        select: {mail: AwsSnsTopic({})},
      }),
    ).toThrow(/does not satisfy component 'Messaging.EmailSender'/);
  });
});

describe('AwsSesIdentity production access', () => {
  const request = {
    domain: 'example.com',
    productionAccess: true,
    websiteUrl: 'https://example.com',
    useCaseDescription: 'Order receipts to customers who bought something',
  };

  it('sends no production access key when none is set', () => {
    const [component] = build(
      AwsSesIdentity({domain: 'example.com'}),
    ).components;

    expect(Object.keys(component.parameters)).toEqual(['domain']);
  });

  it('sends productionAccess and the details of its request', () => {
    const [component] = build(
      AwsSesIdentity({
        ...request,
        mailType: 'MARKETING',
        contactLanguage: 'JA',
      }),
    ).components;

    expect(component.parameters).toEqual({
      ...request,
      mailType: 'MARKETING',
      contactLanguage: 'JA',
    });
  });

  it('sends productionAccess false, which keeps the sandbox', () => {
    const [component] = build(
      AwsSesIdentity({domain: 'example.com', productionAccess: false}),
    ).components;

    expect(component.parameters).toEqual({
      domain: 'example.com',
      productionAccess: false,
    });
  });

  it.each([
    ['websiteUrl', {websiteUrl: undefined}],
    ['websiteUrl', {websiteUrl: '  '}],
    ['useCaseDescription', {useCaseDescription: undefined}],
    ['useCaseDescription', {useCaseDescription: ''}],
  ])('refuses productionAccess without %s', (key, change) => {
    expect(() => build(AwsSesIdentity({...request, ...change}))).toThrow(
      new RegExp(`AwsSesIdentity 'mail': productionAccess needs ${key}`),
    );
  });

  it('refuses a websiteUrl that is not an http(s) URL', () => {
    expect(() =>
      build(AwsSesIdentity({...request, websiteUrl: 'example.com'})),
    ).toThrow(/AwsSesIdentity 'mail': websiteUrl/);
  });

  it('refuses a mailType or contactLanguage the agent does not know', () => {
    expect(() =>
      build(
        // @ts-expect-error not a mail type
        AwsSesIdentity({...request, mailType: 'BULK'}),
      ),
    ).toThrow(/AwsSesIdentity 'mail': mailType/);
    expect(() =>
      build(
        // @ts-expect-error not a contact language
        AwsSesIdentity({...request, contactLanguage: 'DE'}),
      ),
    ).toThrow(/AwsSesIdentity 'mail': contactLanguage/);
  });

  // Without productionAccess the agent reads none of the details: they are
  // sent as given and not checked.
  it('does not check the details without productionAccess', () => {
    expect(() =>
      build(AwsSesIdentity({domain: 'example.com', websiteUrl: 'not a url'})),
    ).not.toThrow();
  });
});
