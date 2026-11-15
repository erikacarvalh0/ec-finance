# Testing strategy (TDD)

Every new behavior or bug fix in EC Finance must follow **red → green → refactor**.

## Workflow

1. **Red:** Write an automated test expressing the desired behavior, edge case, or regression. Run the focused test and confirm that it fails for the expected reason.
2. **Green:** Implement the smallest production change that satisfies the new test. Run the focused test and full suite.
3. **Refactor:** Improve naming, component separation, formatting, or performance while keeping all tests green.
4. Open a PR with tests and implementation committed separately when practical. Explain the tested behavior, relevant failure modes, and verification.

Do not change tests merely to hide implementation bugs. Never merge a failing workflow.

## Test pyramid

- **Unit tests (Vitest):** money calculations, categorization, billing installments, authentication guards, domain services and edge cases.
- **API / repository contract tests (Vitest):** HTTP response status, serialization, authorization and tenant filters.
- **Database integration tests (implemented):** disposable PostgreSQL database, Prisma-backed user-scoped reads and database-level ownership constraints. Migration verification and concurrency/idempotency remain future work.
- **UI / E2E tests (planned):** React Testing Library for component interactions and Playwright for Google sign-in redirect, dashboard protection and critical finance workflows. Actual Google OAuth handshake requires a dedicated test environment; do not place real Google credentials in CI.

## Commands

```bash
npm test
npm run test:watch
npm run test:coverage
npm run test:integration # requires a disposable ec_finance_test PostgreSQL database
npm run typecheck
npm run build
```

The initial coverage gate measures the security-sensitive authentication guard, transaction repository and transactions GET route only. Thresholds: **85% lines, functions and statements; 75% branches**. Expand to all domain modules as production functionality is added. Coverage percentage alone cannot prove security.

## CI and PR checks

The GitHub Actions pipeline installs dependencies, compiles the upstream Design System, generates Prisma Client, runs coverage checks, validates TypeScript and builds Next.js. A separate job starts PostgreSQL 16 and executes the database integration suite.

Unit tests still use mocks, while the integration job runs against a real disposable PostgreSQL instance. Review migration and deployment safeguards before handling production financial data. See [PostgreSQL integration tests](database-testing.md).
