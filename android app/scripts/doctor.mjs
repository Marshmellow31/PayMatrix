import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAndroidEnvironment } from './android-environment.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const androidRoot = resolve(scriptDir, '..');
const { javaHome, androidHome, missing } = resolveAndroidEnvironment();
const java = javaHome
  ? resolve(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : null;

console.log(`Node: ${process.version}`);
console.log(`JAVA_HOME: ${javaHome || '(unset)'}`);
console.log(`ANDROID_HOME: ${androidHome || '(unset)'}`);
console.log(`Firebase config: ${existsSync(resolve(androidRoot, 'android', 'app', 'google-services.json')) ? 'present' : 'missing'}`);

if (java && existsSync(java)) {
  spawnSync(java, ['-version'], { stdio: 'inherit' });
}

if (missing.length) {
  missing.forEach((message) => console.error(message));
  process.exit(1);
}

console.log('Android toolchain paths are ready.');
