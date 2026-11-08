import {defineConfig, globalIgnores} from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'typescript-eslint';
export default defineConfig([
  globalIgnores(['**/node_modules/**', '**/.next/**', '**/dist/**', '**/generated/**', '.pnpm-store/**', 'docs/assets/**', '.tmp/**', '**/.turbo/**', 'test-results*/**', 'playwright-report/**', 'playwright-staff-report/**', '.backups/**', 'elephant-goldfish-model/**']),
  ...next, ...ts.configs.recommended,
  {files: ['apps/api/**/*.ts'], rules: {'@typescript-eslint/no-explicit-any': 'error'}}
]);
