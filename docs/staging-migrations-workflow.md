# Manual Prisma migrations for Neon staging

This workflow is deliberately **manual only**. It is not triggered by commits, pull requests, merges, or Vercel deployments.

The repository currently has no `package-lock.json`; the migration job uses `npm install --include=dev` rather than `npm ci`, and therefore package versions are not fully locked. A committed lockfile is recommended for reproducible future migrations.

## One-time GitHub setup

1. In the **Neon** project, select the database branch named **staging**. Use **Connect** and copy its PostgreSQL connection string (including its password). Prefer a dedicated database role limited to the staging branch. Do not use the Neon production branch connection string.
2. In GitHub `ec-finance`, go to **Settings → Environments**, create the environment named `staging`, and preferably add **Required reviewers** so applying migrations requires explicit approval. Do not configure production secrets in this environment.
3. Inside the **staging environment**, add the **environment secret** `STAGING_DATABASE_URL` with the Neon staging connection string. Do **not** add it as a repository-wide secret.
4. Inside the **same staging environment**, add the **environment variable** `STAGING_DATABASE_HOST` with only the hostname from the connection string (e.g. `ep-example-pooler.c-2.sa-east-1.aws.neon.tech`), without `postgresql://`, username, password, port, or path. This hostname must match exactly.
5. Ensure the repository has the Git branch `staging` with the reviewed migrations. This workflow is stored on `main` and explicitly checks out `staging` to execute migrations.

**Important:** Neon branch names are not reliably encoded in PostgreSQL connection URLs. The hostname check protects against accidental hostname mismatches, but it **cannot independently prove** that the configured Neon endpoint belongs to the staging branch. Verify this in the Neon dashboard before saving the secret. If production and staging share a hostname, use separate dedicated endpoints/roles and verify credentials carefully.

## Run manually

1. After this PR is merged into `main`, open **GitHub → Actions → Staging database migrations (manual) → Run workflow**.
2. Select **Branch: main** (the workflow intentionally rejects other dispatch refs).
3. Choose `status` first. This runs `prisma migrate status` against the Neon staging database; pending migrations may cause a nonzero exit code.
4. To apply, choose `apply` and enter the exact confirmation `APPLY-STAGING-MIGRATIONS`.
5. Review the logs. The job runs `prisma migrate deploy` and then `prisma migrate status`. If environment required reviewers are enabled, an authorized reviewer must approve before the job starts.

## Validate the authentication tables

In the **Neon staging branch** SQL Editor, run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('User', 'Account', 'Session', '_prisma_migrations')
ORDER BY table_name;
```

All four names should appear after a successful initial deployment. Then retry Google OAuth on the staging domain.

## Security boundaries

- Only `workflow_dispatch`; no automatic migration on push or deployment.
- The dispatch must use `main`; the job checks out migration files from `staging`.
- Uses only the `staging` GitHub environment secret and exact expected Neon hostname.
- Explicit confirmation for the write operation; optional environment reviewer gate.
- Read-only repository permissions, serialized migration jobs, no credentials printed.
- No production secrets, production environment, production migrations, or production deploy commands.
- `prisma migrate deploy` applies reviewed SQL migrations. Back up staging before applying migrations that might delete or transform data.
