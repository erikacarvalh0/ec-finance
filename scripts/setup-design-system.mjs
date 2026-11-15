import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const SOURCE = 'https://github.com/erikacarvalh0/erikacarvalho-ds.git';
// Update only after reviewing the new upstream DS revision.
const REVISION = 'af259336bf210728932dfc41a0a05c53e9ce1507';
const root = process.cwd();
const checkout = resolve(root, '.design-system');
const library = resolve(checkout, 'packages/react');
const packageFile = resolve(library, 'package.json');

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

try {
  if (!existsSync(packageFile)) {
    if (existsSync(checkout)) {
      rmSync(checkout, { recursive: true, force: true });
    }
    mkdirSync(checkout, { recursive: true });
    run('git', ['init', '--quiet'], checkout);
    run('git', ['remote', 'add', 'origin', SOURCE], checkout);
  }

  // Fetch a pinned, reviewed revision, not the moving main branch.
  run('git', ['fetch', '--quiet', '--depth', '1', 'origin', REVISION], checkout);
  run('git', ['checkout', '--quiet', '--force', 'FETCH_HEAD'], checkout);

  run('npm', ['install', '--no-audit', '--no-fund'], library);
  run('npm', ['run', 'build'], library);
  run('npm', ['install', '--no-save', '--install-links', '--no-audit', '--no-fund', './.design-system/packages/react']);
  console.log('EC Design System ready at revision ' + REVISION);
} catch (error) {
  console.error('Design system setup failed. Verify Git, npm and GitHub access.');
  process.exitCode = 1;
}
