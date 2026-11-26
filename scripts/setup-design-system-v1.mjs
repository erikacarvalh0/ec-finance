import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), 'ecds-v1-'));
const revision = '2067c5ee47ecaca397f3b76c827a65d44d76623b';
const run = (command,args,cwd=temp) => execFileSync(command,args,{cwd,stdio:'inherit'});
try {
  run('git',['init','--quiet']);
  run('git',['fetch','--depth','1','https://github.com/erikacarvalh0/erikacarvalho-ds-v1.git',revision]);
  run('git',['checkout','--detach','FETCH_HEAD']);
  // The pinned ECDS revision has two icon barrels with the same declaration output.
  // Consolidate both until the upstream package removes the duplicate.
  const icons = join(temp, 'src/atoms/Icons');
  const legacy = join(icons, 'index.ts');
  const entry = join(icons, 'index.tsx');
  if (readdirSync(icons).includes('index.ts')) {
  const exports = new Set([...readFileSync(entry, 'utf8').split('\n'), ...readFileSync(legacy, 'utf8').split('\n')].filter(Boolean));
  writeFileSync(entry, [...exports].join('\n') + '\n');
  rmSync(legacy);
  }
  // SVGR-style icons destructure title but the pinned revision omits its type.
  for (const name of ['ArrowDown', 'ArrowUp', 'Calendar', 'ChartBar', 'CreditCard', 'Dashboard', 'Info', 'Logout', 'Target', 'User', 'Wallet']) {
    const file = join(icons, name + '.tsx');
    const source = readFileSync(file, 'utf8');
    const fixed = source.replace('{ titleId?: string }', '{ title?: string; titleId?: string }');
    if (fixed === source && !source.includes('title?: string')) throw Error('Unexpected ECDS icon signature: ' + name);
    writeFileSync(file, fixed);
  }
  run('yarn',['install','--frozen-lockfile','--production=false']);
  run('npm',['pack']);
  const packs = readdirSync(temp).filter(name=>name.endsWith('.tgz'));
  if(packs.length!==1) throw Error('Expected exactly one package');
  run('npm',['install','--include=dev','--no-save','--package-lock=false',join(temp,packs[0])],root);
} finally { rmSync(temp,{recursive:true,force:true}); }
