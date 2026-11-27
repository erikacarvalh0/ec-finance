import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function migrationTarget(env) {
    if (env.VERCEL !== '1') return false;
    if (env.VERCEL_ENV === 'production') {
        if (env.VERCEL_GIT_COMMIT_REF === 'staging') throw new Error('Staging cannot deploy to production.');
        return false;
    }
    if (env.VERCEL_ENV !== 'preview') return false;
    if (!env.VERCEL_GIT_COMMIT_REF) throw new Error('Missing Vercel Git branch metadata.');
    if (env.VERCEL_GIT_COMMIT_REF !== 'staging') return false;
    let url;
    try { url = new URL(env.DATABASE_URL); } catch { throw new Error('Invalid staging database URL.'); }
    if (!env.STAGING_DATABASE_HOST || !['postgresql:', 'postgres:'].includes(url.protocol)
        || !url.hostname.endsWith('.neon.tech') || url.hostname !== env.STAGING_DATABASE_HOST
        || !url.username || !url.password || url.pathname === '/') {
        throw new Error('Staging database target verification failed.');
    }
    return true;
}

export function runGate(env = process.env, run = spawnSync) {
    if (!migrationTarget(env)) return;
    for (const args of [['prisma', 'migrate', 'deploy'], ['prisma', 'migrate', 'status']]) {
        const result = run('npx', ['--no-install', ...args], { env, stdio: 'inherit' });
        if (result.error || result.status !== 0) throw new Error('Staging migration gate failed; publication blocked.');
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { runGate(); } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
