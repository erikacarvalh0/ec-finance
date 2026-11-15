# Architecture

## Technical direction

Start with a modular monolith: Next.js App Router, domain modules, PostgreSQL/Prisma later, a provider adapter for Open Finance, and background jobs for sync.

## Security boundary

User registration and real financial data are intentionally disabled in the first scaffold. Every future query must derive ownership from a verified server session, never a client-provided user id. Add authorization tests before connecting accounts.

## Design system

The current DS React workspace does not ship a consumable library. UI components in `src/components/design-system` are *temporary adapters*, not direct upstream imports. Prepare accessible React primitives upstream, package them, and then replace these adapters.
