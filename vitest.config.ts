import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        clearMocks: true,
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: [
                'src/lib/auth/require-user.ts',
                'src/modules/transactions/repository.ts',
                'src/app/api/transactions/route.ts',
            ],
            thresholds: {
                lines: 85,
                functions: 85,
                branches: 75,
                statements: 85,
            },
        },
    },
});
