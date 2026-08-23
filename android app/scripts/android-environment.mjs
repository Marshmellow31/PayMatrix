import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const defaultJdk = process.platform === 'win32'
  ? 'C:\\Program Files\\Android\\Android Studio\\jbr'
  : undefined;
const defaultSdk = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk')
  : undefined;

export const resolveAndroidEnvironment = () => {
  const javaHome = process.env.JAVA_HOME || defaultJdk;
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultSdk;
  const missing = [];

  if (!javaHome || !existsSync(javaHome)) missing.push(`JDK not found: ${javaHome || '(unset)'}`);
  if (!androidHome || !existsSync(androidHome)) {
    missing.push(`Android SDK not found: ${androidHome || '(unset)'}`);
  }

  return { javaHome, androidHome, missing };
};
