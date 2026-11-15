# Design System integration

Upstream: https://github.com/erikacarvalh0/erikacarvalho-ds

The initial EC Finance UI used self-contained DS-prefixed temporary components. This PR replaces them with actual upstream `Button` and `Card` via imports from `@erikacarvalho/react`. Upstream is currently a monorepo whose publishable React package sits at `packages/react`; npm Git URLs install only the repository root package, not an arbitrary workspace. The integration therefore bootstraps a pinned upstream git commit and builds the React workspace locally.

## Upgrade steps

1. Review upstream commit and React library changelog.
2. Change `REVISION` in `scripts/setup-design-system.mjs`.
3. Run `npm install && npm run setup:ds && npm run typecheck && npm run build`.
4. Review visual differences, accessibility and peer dependency compatibility.

## Future

Publish a semantically versioned package to npm or GitHub Packages and switch to a regular lockfile-tracked dependency. Do not use a floating Git branch for production deployments.
