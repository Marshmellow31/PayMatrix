import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAndroidEnvironment } from './android-environment.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const androidRoot = resolve(scriptDir, '..');
const nativeRoot = resolve(androidRoot, 'android');
const wrapper = resolve(nativeRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const tasks = process.argv.slice(2);
const { javaHome, androidHome, missing } = resolveAndroidEnvironment();

if (missing.length) {
  missing.forEach((message) => console.error(message));
  process.exit(1);
}

if (!existsSync(wrapper)) {
  console.error('Gradle wrapper is missing. Run `npx cap add android` first.');
  process.exit(1);
}

if (tasks.some((task) => /bundleRelease|assembleRelease/i.test(task))) {
  const signingProperties = resolve(nativeRoot, 'key.properties');
  if (!existsSync(signingProperties)) {
    console.error('Release signing is not configured. Create android/key.properties from key.properties.example.');
    process.exit(1);
  }
}

const escapedSdkPath = androidHome.replaceAll('\\', '/').replace(':', '\\:');
writeFileSync(resolve(nativeRoot, 'local.properties'), `sdk.dir=${escapedSdkPath}\n`);

if (tasks.some((task) => !/^[A-Za-z0-9:._-]+$/.test(task))) {
  console.error('Gradle task contains unsupported characters.');
  process.exit(1);
}

const gradleCommand = process.platform === 'win32' ? 'cmd.exe' : wrapper;
const gradleArgs = process.platform === 'win32'
  ? ['/d', '/c', 'call', wrapper, ...tasks]
  : tasks;

const result = spawnSync(gradleCommand, gradleArgs, {
  cwd: nativeRoot,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: androidHome,
  },
  stdio: 'inherit',
});

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
