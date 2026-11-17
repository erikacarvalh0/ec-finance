# Database recovery gate

Before private beta, enable provider-managed encrypted backups and verify retention and recovery access. Use a separate staging instance for restore drills. Never restore over production during a drill.

## Backup

Use PostgreSQL client tools compatible with the server version. Inject credentials through a protected environment or credential file; never paste them into logs or commit them. On approved encrypted storage, with restrictive file permissions:

```sh
umask 077
pg_dump --format=custom --file=finance.dump
pg_restore --list finance.dump
```

Configure connection via PGHOST, PGPORT, PGDATABASE, PGUSER and a protected PGPASSFILE. Require TLS for remote connections. Record backup timestamp, checksum and retention expiry without financial data.

## Restore drill

Provision a new empty isolated database. Verify the target host and database name independently before restoring. Use a dedicated least-privilege restore role with the necessary permissions.

```sh
pg_restore --exit-on-error --no-owner --no-privileges finance.dump
```

Confirm migrations, row counts, authentication, ownership isolation, balances and representative financial calculations. Measure recovery time and backup age. Do not expose restored real data to unauthorized testers. Destroy the isolated copy after verification.

## Release gate

Record the actual recovery point and recovery time, operator approval and evidence of a successful staging restore. Establish retention, access controls and recurring backup verification. This document alone does not certify recovery.
