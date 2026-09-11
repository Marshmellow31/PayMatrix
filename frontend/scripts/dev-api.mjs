import http from 'node:http';
import { loadEnv } from 'vite';

Object.assign(process.env, loadEnv('development', process.cwd(), ''));
const routes = new Set([
  'create-order',
  'verify-payment',
  'create-subscription',
  'verify-subscription',
  'manage-subscription',
  'pro-status',
  'razorpay-subscription-webhook',
  'scan-bill',
]);
http
  .createServer(async (req, res) => {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (value) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(value));
      return res;
    };
    res.send = (value) => {
      res.end(value);
      return res;
    };
    res.setHeader('Cache-Control', 'no-store');
    const name = new URL(req.url, 'http://localhost').pathname.replace('/api/', '');
    if (!routes.has(name)) return res.status(404).json({ error: 'Unknown API route.' });
    try {
      if (name !== 'razorpay-subscription-webhook') {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 8_000_000) return res.status(413).json({ error: 'Request too large.' });
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString();
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch {
          return res.status(400).json({ error: 'Invalid JSON.' });
        }
      }
      await (await import(`../api/${name}.js`)).default(req, res);
    } catch {
      if (!res.writableEnded)
        res.status(500).json({ error: 'Local API failed. Check server configuration.' });
    }
  })
  .listen(5000, '127.0.0.1', () => console.log('paymatrix API: http://127.0.0.1:5000'));
