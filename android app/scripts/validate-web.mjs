import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const androidRoot = resolve(scriptDir, '..');
const webRoot = resolve(androidRoot, 'www');
const failures = [];

const requiredFiles = ['index.html', 'runtime-metadata.json'];
for (const file of requiredFiles) {
  if (!existsSync(resolve(webRoot, file))) failures.push(`Missing ${file}`);
}

if (existsSync(resolve(webRoot, 'sw.js'))) {
  failures.push('Android bundle must not contain a PWA service worker');
}

const textExtensions = new Set(['.html', '.js', '.css', '.json', '.map']);
const visit = (directory) => {
  for (const entry of readdirSync(directory)) {
    const absolute = resolve(directory, entry);
    if (statSync(absolute).isDirectory()) {
      visit(absolute);
      continue;
    }
    if (!textExtensions.has(extname(entry))) continue;
    const content = readFileSync(absolute, 'utf8');
    if (/https?:\/\/(localhost|127\.0\.0\.1):\d+/i.test(content)) {
      failures.push(`${relative(webRoot, absolute)} contains a development server URL`);
    }
  }
};

if (existsSync(webRoot)) visit(webRoot);

if (failures.length) {
  console.error('Android web artifact validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Android web artifact validation passed.');
