# Private beta release gate

Record the reviewed commit and staging URL. Each gate requires actual evidence before approval.

- [ ] CI green and all release PRs reviewed.
- [ ] Separate staging and production databases and OAuth clients; restricted tester access.
- [ ] Run npm run check:production with authorized environment variables (Node 22.18+).
- [ ] Rehearse migration and restore using beta-migrations.md and database-recovery.md.
- [ ] Validate HTTPS, HSTS and CSP report-only violations; approve enforcement policy.
- [ ] Verify /api/health returns 200 without sensitive details.
- [ ] Validate real OAuth sign-in, sign-out and two-account isolation.
- [ ] Exercise income, expense, card, budget, goal, investment and report journeys; reconcile totals in cents.
- [ ] Confirm Open Finance is unavailable until provider approval.
- [ ] Confirm logs exclude credentials and financial records; test operational alerts.
- [ ] Obtain explicit production approval and document rollback owner.

Do not use real financial records before the security and recovery gates pass. A checked item must link to evidence; this file alone is not release approval.
