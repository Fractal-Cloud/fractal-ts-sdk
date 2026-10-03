/**
 * Fails when a test file declares an import or a local it never uses.
 *
 * Test files are excluded from `tsconfig.json` (and from linting), so the
 * compiler's `noUnusedLocals` never sees them. Typechecking them in full is not
 * an option: they deliberately pass ill-typed values to prove runtime refusals.
 * This compiles them with the project's options and reports only the
 * "declared but never used" diagnostics, so an unused import still breaks the
 * build.
 */
import ts from 'typescript';
import {readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const UNUSED_CODES = new Set([6133, 6192, 6196, 6198, 6205]);

const collect = dir =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return collect(path);
    }
    return /\.test(-d)?\.ts$/.test(name) ? [path] : [];
  });

const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
const {config} = ts.readConfigFile(configPath, ts.sys.readFile);
const {options} = ts.parseJsonConfigFileContent(config, ts.sys, '.');
const files = collect('src');
const program = ts.createProgram(files, {
  ...options,
  noEmit: true,
  noUnusedLocals: true,
  types: ['node', 'vitest/globals'],
});
const unused = files.flatMap(file =>
  program
    .getSemanticDiagnostics(program.getSourceFile(file))
    .filter(d => UNUSED_CODES.has(d.code)),
);
for (const d of unused) {
  const {line, character} = d.file.getLineAndCharacterOfPosition(d.start);
  const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  console.error(`${d.file.fileName}:${line + 1}:${character + 1} ${message}`);
}
if (unused.length > 0) {
  console.error(`${unused.length} unused declaration(s) in test files.`);
  process.exit(1);
}
