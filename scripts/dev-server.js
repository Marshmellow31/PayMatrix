// Compatibility entrypoint; use the same handlers as deployment.
const path = require('node:path');
process.chdir(path.join(__dirname, '../frontend'));
import('../frontend/scripts/dev-api.mjs');
