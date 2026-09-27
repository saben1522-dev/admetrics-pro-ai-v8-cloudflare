import { json, auth, readJson, roleAllowed, audit, nowIso } from '../_utils.js';
export async function onRequestPost({ request, env }) {
  const u = await auth(request, env);
  if (!u) return json({ error: 'Login required' }, 401);
  if (!roleAllowed(u, ['owner','admin','marketer'])) return json({ error: 'Role not allowed' }, 403);
  const b = await readJson(request);
  const row = await env.DB.prepare('SELECT state_json FROM workspaces WHERE user_id=?1').bind(u.id).first();
  const w = row ? JSON.parse(row.state_json) : { workspace: { role: u.role }, metrics: [] };
  w.metrics = Array.isArray(w.metrics) ? w.metrics : [];
  w.metrics.push(...(Array.isArray(b.rows) ? b.rows : []));
  w.metrics = w.metrics.slice(-10000);
  await env.DB.prepare(`INSERT INTO workspaces(user_id,state_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at`)
    .bind(u.id, JSON.stringify(w), nowIso()).run();
  await audit(env, u, 'METRICS_IMPORTED', String((b.rows || []).length));
  return json({ ok: true, count: (b.rows || []).length });
}
