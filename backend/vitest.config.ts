import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/__tests__/**/*.test.ts'],
        setupFiles: ['src/__tests__/setup.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/__tests__/**', 'src/server.ts', 'src/seed.ts'],
            reporter: ['text', 'lcov'],
            thresholds: {
                statements: 70,
            },
        },
    },
});
