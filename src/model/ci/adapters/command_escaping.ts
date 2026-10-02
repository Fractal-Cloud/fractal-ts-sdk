/**
 * ci/adapters/command_escaping.ts — keep a message from ending, or forging, a
 * CI command.
 *
 * Both CI systems read a command from the start of a stdout line, so a newline
 * in a message would let the rest of it be read as a command of its own (a
 * `::add-mask::` that never comes, an `##vso[task.setvariable]` that does).
 * Each escapes the characters its runner decodes back.
 */

/** GitHub Actions workflow-command data. */
export const escapeGitHubData = (value: string): string =>
  value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

/** Azure DevOps logging-command data. */
export const escapeAzureDevOpsData = (value: string): string =>
  value.replace(/%/g, '%AZP25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
