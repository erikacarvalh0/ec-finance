# EC Finance

Next.js + TypeScript personal finance product designed for multiple users.

> **Current status:** GitHub OAuth and database-backed sessions are implemented in code but require a configured PostgreSQL database and OAuth application to run. The dashboard uses fictional financial data only. Open Finance is not connected.

## Run locally

Requirements: Node.js 22+, npm, Git, PostgreSQL, and a GitHub OAuth application.

```bash
npm install
npm run setup:ds
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID and AUTH_GITHUB_SECRET.
npm run db:generate
npm run db:migrate
npm run dev
```

In the GitHub OAuth app, use `http://localhost:3000/api/auth/callback/github` as the development callback URL.

## Validate

```bash
npm run db:generate
npm test
npm run typecheck
npm run build
```

CI generates Prisma Client and runs tests, typecheck and Next.js build. CI does not connect to a live database or test the OAuth handshake.

## Design System

The app consumes actual `Button` and `Card` components from [erikacarvalho-ds](https://github.com/erikacarvalh0/erikacarvalho-ds). The React package is built by `npm run setup:ds` using a pinned upstream Git commit. It has not been published to a package registry yet.

## Architecture and security

- [Authentication and tenant isolation](docs/authentication.md)
- [Security baseline](docs/security.md)
- [Design System integration](docs/design-system.md)

## Conventions

All commits and PR descriptions are written in English. Commits follow Conventional Commits and Gitmoji.

```text
feat(auth): :sparkles: add database-backed sign in
test(auth): :white_check_mark: verify tenant scope
fix(ui): :bug: correct dashboard layout
```
