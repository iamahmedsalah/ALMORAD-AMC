import {defineConfig, globalIgnores} from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'typescript-eslint';
import {createRequire} from 'node:module';
const webRequire = createRequire(new URL('./apps/web/package.json', import.meta.url));
export default defineConfig([
  globalIgnores(['**/node_modules/**', '**/.next/**', '**/dist/**', '**/generated/**', '.pnpm-store/**', 'docs/assets/**', '.tmp/**', '**/.turbo/**', 'test-results*/**', 'playwright-report/**', 'playwright-staff-report/**', '.backups/**', 'elephant-goldfish-model/**']),
  ...next, ...ts.configs.recommended,
  {settings: {next: {rootDir: 'apps/web/'}, react: {version: webRequire('react/package.json').version}}},
  {files: ['apps/api/**/*.ts'], rules: {'@typescript-eslint/no-explicit-any': 'error'}}
]);
