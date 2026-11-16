# EC Finance

Next.js + TypeScript personal finance product designed for multiple users.

> **Current status:** Google OAuth and database-backed sessions are implemented in code but require a configured PostgreSQL database and OAuth application to run. The dashboard uses fictional financial data only. Open Finance is not connected.

## Run locally

Requirements: Node.js 22+, npm, Git, PostgreSQL, and a Google OAuth application.

```bash
npm install
npm run setup:ds
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.
npm run db:generate
npm run db:deploy
npm run dev
```

In the Google OAuth app, use `http://localhost:3000/api/auth/callback/google` as the development callback URL.

## Validate

```bash
npm run db:generate
npm run test:coverage
# Integration tests require a separate ec_finance_test PostgreSQL database.
# See docs/database-testing.md for configuration.
npm run typecheck
npm run build
```

CI generates Prisma Client and runs tests, typecheck and Next.js build. CI does not connect to a live database or test the OAuth handshake.

## Test-driven development

All new features and bug fixes must follow **red → green → refactor**. See [Testing strategy](docs/testing.md). Run `npm run test:watch` while developing and `npm run test:coverage` before opening a PR. The CI enforces coverage thresholds for security-sensitive modules.

## Persisted finance APIs

Authenticated endpoints:

- `GET /api/categories` — list your own categories.
- `POST /api/categories` — create a category with JSON body `{ "name": "Groceries" }`.
- `GET /api/transactions` — list your own recent transactions.
- `POST /api/transactions` — create a manual transaction with a card you own, using a positive string `amountInCents`, an ISO timestamp and optional `categoryId`.

Before first use, run `npm run db:deploy` against a new PostgreSQL database. Do not apply the initial migration to an already-populated database without an explicit baseline plan. See [database testing](docs/database-testing.md).

## Finance tracking

- `/expenses` — manual expenses with payment method, type, optional date and installments.
- `/incomes` — salary, recurring or other income.
- `/investments` — named investments, valuation history and a line chart.
- Dashboard — current-month fixed expenses and explicit credit-card fixed classification.

See [Finance tracking modules](docs/finance-tracking.md) for recurrence rules, valuation semantics, ownership boundaries and limitations.

## Forward-looking cashflow

The dashboard and `/forecast` show six months of projected installments, fixed expenses and recurring income. Projections are not confirmed charges or bank balances. See [Monthly cashflow forecast](docs/cashflow-forecast.md).

## Payment reconciliation

The `/forecast` page lets authenticated users mark an individual installment or recurring income as pending, paid/received or canceled. Settled occurrences can record their actual amount, and the dashboard distinguishes realized from pending totals. Original schedules remain unchanged. See [Forecast reconciliation](docs/forecast-reconciliation.md).

## Record editing and overdue tracking

Expenses and incomes support editing, and recurring records can be ended on a chosen date without deleting prior payments. The dashboard highlights overdue pending expenses. See [editing and overdue tracking](docs/record-editing.md).

## Design System

The app consumes actual `Button` and `Card` components from [erikacarvalho-ds](https://github.com/erikacarvalh0/erikacarvalho-ds). The React package is built by `npm run setup:ds` using a pinned upstream Git commit. It has not been published to a package registry yet.

## Architecture and security

- [Authentication and tenant isolation](docs/authentication.md)
- [PostgreSQL integration tests](docs/database-testing.md)
- [Security baseline](docs/security.md)
- [Design System integration](docs/design-system.md)

## Conventions

All commits and PR descriptions are written in English. Commits follow Conventional Commits and Gitmoji.

```text
feat(auth): :sparkles: add database-backed sign in
test(auth): :white_check_mark: verify tenant scope
fix(ui): :bug: correct dashboard layout
```
