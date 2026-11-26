# Staging acceptance — ECDS v1
Do not change production setup before the following checks pass against the candidate.
- [ ] Install pinned tarball without peer overrides.
- [ ] Run typecheck, coverage, Next build and Playwright suite.
- [ ] Create expense with decimal amount, category, credit card and installments.
- [ ] Create recurring income; verify native required fields and reset.
- [ ] Verify disabled submit during request, error feedback and no duplicate request.
- [ ] Compare authenticated dashboard, cards and forms against v2 screenshots.
- [ ] Verify keyboard navigation, focus, CSS isolation and hydration.
- [ ] Record staging deployment SHA and rollback to previous pinned v2 revision if needed.
