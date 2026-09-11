import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const androidRoot = resolve(scriptDir, '..');
const repositoryRoot = resolve(androidRoot, '..');
const frontendRoot = resolve(repositoryRoot, 'frontend');
const outputDir = resolve(androidRoot, 'www');
const npmEntry = process.env.npm_execpath;

mkdirSync(outputDir, { recursive: true });

if (!npmEntry) {
  console.error('npm_execpath is unavailable. Run this script through `npm run web:build`.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    npmEntry,
    '--prefix',
    frontendRoot,
    'run',
    'build',
    '--',
    '--mode',
    'android',
    '--outDir',
    outputDir,
    '--emptyOutDir',
  ],
  {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      VITE_APP_RUNTIME: 'android',
      VITE_SCAN_API_URL:
        process.env.VITE_SCAN_API_URL || 'https://pay-matrix.vercel.app/api/scan-bill',
    },
    stdio: 'inherit',
  }
);

if (result.error) {
  console.error(result.error.message);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const serviceWorker = resolve(outputDir, 'sw.js');
if (existsSync(serviceWorker)) rmSync(serviceWorker);

const gitResult = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});

const metadata = {
  runtime: 'android',
  version: process.env.npm_package_version || '1.2.0',
  commit: gitResult.status === 0 ? gitResult.stdout.trim() : 'unavailable',
  builtAt: new Date().toISOString(),
};

writeFileSync(resolve(outputDir, 'runtime-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
