# Beta migration and rollback gate

Use a separate staging PostgreSQL database and rehearse the exact release commit before production. Confirm the target database independently; never run migrate reset on production.

1. Verify an encrypted backup and isolated restore drill following database-recovery.md.
2. Run npm ci, npm run db:generate, npm run db:validate, npm run typecheck and tests.
3. Inspect pending migration SQL for destructive changes and incompatible constraints.
4. Run npx prisma migrate status, then npm run db:deploy against staging. Check migration status again.
5. Deploy the same reviewed commit, verify /api/health and run authenticated smoke tests.
6. Record migration versions, release commit, backup timestamp and operator approval.

## Failure handling

Stop the rollout on failed migration, failed readiness or incorrect financial totals. Do not rerun blindly. Inspect migration state and logs without secrets. Roll back application code only if the migrated schema is compatible with that version. Otherwise use a reviewed forward fix or restore into a new isolated database, reconcile writes since backup, and explicitly approve switching traffic. Never use migrate resolve to conceal an incomplete migration.

Production rollout requires a successful staging rehearsal and a verified recovery path. This document is not evidence of a completed rehearsal.
