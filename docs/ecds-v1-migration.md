# ECDS v1 migration
Production continues using the pinned v2 setup until the v1 peer range and adapters pass CI.

## API differences to validate
- Button uses action, text, isDisabled, customClass and theme rather than assuming native button props. Submit semantics require special care: v1 does not currently forward its type prop.
- Card requires title and subtitle; review layout and heading semantics.
- Input and Select manage their own state; do not replace controlled financial forms without verifying value, validation and submission behavior.
- Verify CSS isolation, focus, disabled state, accessibility and hydration.

## Cutover gates
1. React 19 normal peer resolution passes upstream.
2. Pin reviewed v1 commit; build tarball with npm pack.
3. Adapt existing consumers and run typecheck, unit tests, build and staging E2E.
4. Replace production setup only after review; retain previous revision for rollback.
5. Switch to published npm version once account access is restored.
