# Multi-user authentication

## Overview

EC Finance uses Auth.js and the Prisma adapter to store identities, OAuth accounts and database sessions in PostgreSQL.

- Google OAuth is the first sign-in provider (additional providers may be added later).
- A signed, HTTP-only session cookie identifies the user; the session is resolved server-side.
- The dashboard redirects unauthenticated requests to `/sign-in`.
- The transactions endpoint returns HTTP 401 for unauthenticated requests.
- Database queries for personal transactions are always scoped to the current session's user ID.

## Required configuration

Create `.env` from `.env.example`. Set:

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: cryptographically random secret
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: Google OAuth App credentials

Register the application callback URL as `http://localhost:3000/api/auth/callback/google` for local development. Configure the deployment URL separately in Google OAuth.

## Local setup

```bash
npm install
npm run setup:ds
npm run db:generate
npm run db:migrate
npm run dev
```

Never commit `.env` files. Run migrations in the deployment pipeline before receiving authenticated traffic.

## Authorization rules

- Do not accept a client-supplied `userId` as proof of ownership.
- All financial queries must be scoped using `requireCurrentUserId()`.
- For lookups by ID, query by both resource ID **and** session user ID.
- Verify ownership of foreign-key relationships when creating transactions, assigning categories or linking credit cards.
- Do not return OAuth credentials or provider tokens from API routes.
- Extend tests to check cross-user writes and updates before enabling bank synchronization.

## Authentication failure monitoring

Auth.js errors emit one JSON record to stderr with only `level: "error"`,
`event: "auth.failure"` and a generated `correlationId`. Authentication API
responses include the same ID in `x-correlation-id`; client-supplied IDs are
ignored. Concurrent requests have separate IDs. Errors outside the authentication
API (such as server-side session reads) get a new ID per error event.

Unexpected thrown authentication handler errors return a generic, non-cacheable
500 response. Error messages, stacks, request URLs, headers, bodies, user data,
bank data and tokens are never passed to this logger.

The log collector can filter `event = auth.failure` and `level = error` to count
failures and configure a rate-based alert, then investigate using `correlationId`.
Alert delivery and thresholds must be configured in the hosting environment;
this change does not provision an alert service or monitor other API routes.

## Current limitations

This PR implements the authentication and data-model foundations. A configured PostgreSQL instance and Google OAuth application are required to use the sign-in flow. No migrations are committed yet, and bank synchronization is not enabled. The dashboard still displays only fictional data, regardless of the authenticated user. Before launch, add account deletion and consent retention flows, rate limiting, monitoring, and deploy-time migration verification.
