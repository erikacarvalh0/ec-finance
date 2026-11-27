import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrationTarget, runGate } from './staging-migration-gate.mjs';

const env = { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'staging',
    DATABASE_URL: 'postgresql://test:test@ep-staging.neon.tech/neondb',
    STAGING_DATABASE_HOST: 'ep-staging.neon.tech' };

test('only staging preview runs migrations', () => {
    assert.equal(migrationTarget(env), true);
    assert.equal(migrationTarget({...env, VERCEL_GIT_COMMIT_REF: 'feature'}), false);
    assert.equal(migrationTarget({...env, VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main'}), false);
    assert.equal(migrationTarget({}), false);
});
test('fails closed on wrong host, missing configuration or staging production', () => {
    for (const override of [{ STAGING_DATABASE_HOST: '' }, { DATABASE_URL: 'postgresql://test:test@ep-prod.neon.tech/neondb' },
        { VERCEL_GIT_COMMIT_REF: '' }, { VERCEL_ENV: 'production' }]) {
        assert.throws(() => migrationTarget({...env, ...override}));
    }
});
test('migration failure prevents subsequent status and publication', () => {
    let calls = 0;
    assert.throws(() => runGate(env, () => { calls++; return { status: 1 }; }));
    assert.equal(calls, 1);
});
test('verifies migration status after successful deploy', () => {
    const calls = [];
    runGate(env, (_, args) => { calls.push(args); return { status: 0 }; });
    assert.deepEqual(calls, [['--no-install','prisma','migrate','deploy'], ['--no-install','prisma','migrate','status']]);
    assert.throws(() => runGate(env, (_, args) => ({ status: args.includes('status') ? 1 : 0 })));
});
