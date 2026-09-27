import { json } from './_utils.js';
export async function onRequestGet({ env }) {
  return json({ ok: true, version: '8.0.1-cf', service: 'AdMetrics Pro AI V8', ai: false, storage: env.DB ? 'Cloudflare D1' : 'D1 binding missing' });
}
