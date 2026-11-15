# PostgreSQL integration tests

## Purpose

The tests under `src/**/*.integration.test.ts` use a real disposable PostgreSQL database and Prisma Client. They verify:

- A user cannot retrieve another user's transaction through the repository.
- The database rejects a transaction referencing a different user's credit card.
- The database rejects a transaction referencing a different user's category.
- The database rejects a card referencing a different user's bank connection.

The database enforces relationship ownership through composite foreign keys using `userId`, rather than relying exclusively on application checks.

## Local execution

Start a disposable PostgreSQL instance with a database named `ec_finance_test`, then run:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ec_finance_test?schema=public"
npm install
npm run db:generate
npm run db:deploy
npm run test:integration
```

**Safety:** The test refuses to run unless the connection string includes `ec_finance_test`. Use only disposable test databases. Never point integration tests or `prisma db push` at production.

## CI

A separate GitHub Actions job provisions PostgreSQL 16, applies the reviewed SQL migrations with `prisma migrate deploy`, and runs the integration tests. Unit tests and coverage remain a separate fast job, keeping the TDD feedback loop short.

## Database migration limitation

The initial migration is committed in `prisma/migrations`. Integration CI runs `prisma migrate deploy` on a disposable database, instead of `db push`. Production deployments must also use `prisma migrate deploy` with reviewed credentials and backups. **Do not run the initial migration against a populated preexisting database:** coordinate a baseline migration or data-preserving upgrade first.

This suite does not yet exercise Google OAuth end-to-end, bank webhooks, or concurrency/idempotency.
