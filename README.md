# EC Finance

Next.js + TypeScript MVP scaffold for a multi-user finance product.

## Running

Node.js 22+, `npm install` then `npm run dev`.

The initial dashboard uses **fictional sample data**. Authentication, multi-tenancy, real banking integration and database persistence are not implemented. Do not enter real banking information.

## Design system

[erikacarvalho-ds](https://github.com/erikacarvalh0/erikacarvalho-ds) is our intended upstream DS. Its React workspace is not distributed as a reusable package yet. `src/components/design-system` is an isolated **temporary adapter**, not a direct import from that repository. We will evolve and publish upstream components before switching to them.

## Conventional commits + Gitmoji

`feat(app): :sparkles: add dashboard layout`

`fix(banking): :bug: prevent duplicate transactions`

`docs(security): :memo: document tenant isolation`
