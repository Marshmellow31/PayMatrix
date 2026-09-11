/* eslint-env node */

const TRUE = 'true';

export const serverFeatureEnabled = (name, env = process.env) =>
  String(env[name] || '')
    .trim()
    .toLowerCase() === TRUE;

export const requireServerFeature = (name, env = process.env) => {
  if (serverFeatureEnabled(name, env)) return;
  const error = new Error('This feature is currently unavailable.');
  error.statusCode = 503;
  error.code = 'FEATURE_DISABLED';
  throw error;
};
