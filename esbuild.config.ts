import { build } from 'esbuild';

void build({
  entryPoints: ['src/extension/activate.ts'],
  outfile: 'dist/extension/extension.js',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  external: ['vscode']
}).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
