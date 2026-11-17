# Private beta environment

Provision separate staging and production PostgreSQL databases and OAuth clients. Configure DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET using the hosting provider's secret manager. Generate distinct secrets with openssl rand -base64 32. Never commit real values.

Register each environment's HTTPS /api/auth/callback/google URL in its corresponding OAuth client. Restrict beta access to approved accounts through the OAuth provider where supported. Verify TLS, private database access, backup retention and migration status.

Run the production configuration validator before deployment; verify /api/health returns 200 after migration. Test login, logout and cross-user access in staging. Do not enable real banking integrations until consent and provider approval are complete.
