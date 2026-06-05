'use strict';

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

/** Copy static webview assets (css) and media into dist/. main.js is bundled, not copied. */
function copyStaticAssets() {
  fs.mkdirSync('dist/webview/ui', { recursive: true });
  if (fs.existsSync('src/webview/ui/styles.css')) {
    fs.copyFileSync('src/webview/ui/styles.css', 'dist/webview/ui/styles.css');
  }
  if (fs.existsSync('media')) {
    fs.mkdirSync('dist/media', { recursive: true });
    for (const entry of fs.readdirSync('media')) {
      fs.copyFileSync(path.join('media', entry), path.join('dist/media', entry));
    }
  }
}

const staticAssetsPlugin = {
  name: 'static-assets',
  setup(build) {
    build.onEnd(() => {
      copyStaticAssets();
      console.log('[esbuild] build complete');
    });
  },
};

const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  plugins: [staticAssetsPlugin],
};

// Webview script: bundled for the browser so it can import mermaid. IIFE has no code
// splitting, so mermaid's dynamic diagram imports are inlined (no runtime chunk fetches
// to trip the webview CSP). NODE_ENV is defined because mermaid's deps read it.
const webviewConfig = {
  entryPoints: ['src/webview/ui/main.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  outfile: 'dist/webview/ui/main.js',
  define: { 'process.env.NODE_ENV': production ? '"production"' : '"development"' },
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

async function main() {
  if (watch) {
    const ext = await esbuild.context(extensionConfig);
    const web = await esbuild.context(webviewConfig);
    await Promise.all([ext.watch(), web.watch()]);
    console.log('[esbuild] watching...');
  } else {
    await esbuild.build(extensionConfig);
    await esbuild.build(webviewConfig);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
