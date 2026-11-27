# Staging migration gate

Vercel's existing vercel-build command now runs the migration gate after compilation and before successful build completion/publication. The exact checked-out deployment commit supplies migrations. A nonzero migration or status result fails the build. Production and other preview branches do not run migrations. Keep the existing manual recovery workflow.

Before merging, configure STAGING_DATABASE_HOST in Vercel Preview scoped to staging, matching the independently verified Neon staging endpoint in DATABASE_URL. Ensure Vercel system environment variables are exposed and the build command uses vercel.json. Do not use the production database hostname. No credentials should be copied into source control.

Run npm run test:staging-gate. Verify a staging deployment succeeds and a deliberately invalid host on an isolated test deployment fails before publication. Restore configuration immediately. Do not test against production.

Migrations run after compilation to avoid changing the database for a failed compile. Prisma advisory locking protects concurrent migration execution; avoid concurrent staging deployments and manual migrations. Existing deployed code must remain compatible with new schema (expand/contract). A successful migration followed by failed publication does not roll back the database. Vercel deployment ordering and alias behavior must be verified in the project settings.
