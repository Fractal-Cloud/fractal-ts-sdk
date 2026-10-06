/**
 * aws_ses_identity.test.ts — executable spec for the `EmailSender` component and
 * the `AwsSesIdentity` offer (agents #829, `Messaging.PaaS.AwsSesIdentity`):
 *
 *   - `AwsSesIdentity` satisfies `Messaging.EmailSender` and emits the agent's
 *     keys, `domain` (required) and `mailFromSubdomain` (optional);
 *   - what the agent would refuse is refused while building the Live System.
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
    ['', 'empty'],
  ])('refuses the MAIL FROM subdomain %j (%s)', mailFromSubdomain => {
    expect(() =>
      build(AwsSesIdentity({domain: 'example.com', mailFromSubdomain})),
    ).toThrow(/AwsSesIdentity 'mail': mailFromSubdomain/);
  });

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
