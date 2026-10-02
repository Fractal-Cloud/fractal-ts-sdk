module.exports = [
  'dist/',
  'docs/',
  // Sample scripts for a consumer repository: they import the published package
  // name, so they are typechecked against src/ separately, not linted under this
  // project's tsconfig.
  'guides/',
  '**/*.test.ts',
  '**/*.config.ts',
];
