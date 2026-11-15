# EC Finance

Next.js + TypeScript foundation for a multi-user personal finance product.

> Current status: demonstration dashboard with **fictional data only**. No real authentication, persistent data or Open Finance connection.

## Run locally

Requires Node.js 22+, npm and Git with access to GitHub.

```bash
npm install
npm run setup:ds
npm run dev
```

The setup script clones a **pinned revision** of [erikacarvalho-ds](https://github.com/erikacarvalh0/erikacarvalho-ds), builds `packages/react`, then installs the resulting local package. This lets EC Finance use actual upstream `Button` and `Card` exports rather than copying their implementations.

The cloned checkout is stored in the ignored `.design-system` directory. Update its pinned commit hash in `scripts/setup-design-system.mjs` only after reviewing a new DS version. CI follows the same setup.

**Current integration caveat:** This is a Git-backed setup script, not yet a published registry dependency. When the DS is published with versioned releases, replace the bootstrap script with an npm dependency and lockfile.

## Structure

- `src/app` — demo dashboard.
- `src/integrations/open-finance` — provider interface (no active integration).
- `docs/security.md` — mandatory security work before enabling real financial data.

## Conventional Commits + Gitmoji

```text
feat(app): :sparkles: add dashboard layout
feat(ui): :sparkles: integrate design system primitives
fix(banking): :bug: prevent duplicate transactions
chore(ci): :wrench: configure checks
```
