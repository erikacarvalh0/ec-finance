import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:3100',
        trace: 'retain-on-failure',
        ...devices['Desktop Chrome'],
    },
    webServer: {
        command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
        url: 'http://127.0.0.1:3100/sign-in',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
            AUTH_SECRET: 'local-e2e-secret-not-for-production',
            AUTH_URL: 'http://127.0.0.1:3100',
            AUTH_GOOGLE_ID: 'e2e-placeholder',
            AUTH_GOOGLE_SECRET: 'e2e-placeholder',
            DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/ec_finance_test?schema=public',
        },
    },
});
