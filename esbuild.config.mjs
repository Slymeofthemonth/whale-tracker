import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['packages/api/src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.js',
  format: 'cjs',
  sourcemap: true,
  external: [
    'better-sqlite3',  // Native module, can't bundle
  ],
});

console.log('✅ Bundle complete: dist/server.js');
