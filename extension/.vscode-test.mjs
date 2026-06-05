import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/tests/integration/**/*.test.js',
  version: 'stable',
  workspaceFolder: './tests/integration/fixtures/sample-workspace',
  mocha: {
    ui: 'bdd',
    timeout: 30000,
  },
});
