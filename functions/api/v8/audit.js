import { json, auth } from '../_utils.js';
export async function onRequestGet({ request, env }) {
  const u = await auth(request, env);
  if (!u) return json({ error: 'Login required' }, 401);
  const rows = await env.DB.prepare('SELECT created_at AS at, actor_id AS actor, role, action, detail FROM audit ORDER BY id DESC LIMIT 100').all();
  return json({ audit: rows.results || [] });
}
