import {defineConfig} from 'vitest/config';
export default defineConfig({test: {maxWorkers: 2, include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'], exclude: ['**/node_modules/**', '**/*.db.test.ts'], environment: 'node'}});
