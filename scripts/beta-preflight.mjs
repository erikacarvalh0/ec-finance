import { spawnSync } from 'node:child_process';

for (const script of ['check:production', 'db:generate', 'db:validate', 'typecheck', 'test', 'build']) {
    const result = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.error || result.status !== 0) {
        console.error('Beta preflight failed at ' + script);
        process.exit(1);
    }
}
console.log('Beta preflight passed; migration and deployment require separate approval.');
