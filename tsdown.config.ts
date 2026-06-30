import {defineConfig} from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/model/index.ts'],
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
});
