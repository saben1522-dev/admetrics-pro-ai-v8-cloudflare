import { json, auth, readJson, roleAllowed, audit, nowIso } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const u = await auth(request, env);
  if (!u) return json({ error: 'Login required' }, 401);
  const row = await env.DB.prepare('SELECT state_json FROM workspaces WHERE user_id=?1').bind(u.id).first();
  return json({ state: row ? JSON.parse(row.state_json) : null });
}

export async function onRequestPost({ request, env }) {
  const u = await auth(request, env);
  if (!u) return json({ error: 'Login required' }, 401);
  if (!roleAllowed(u, ['owner','admin','marketer'])) return json({ error: 'Role not allowed' }, 403);
  const b = await readJson(request);
  const safe = { ...b, workspace: { ...(b.workspace || {}), role: u.role } };
  await env.DB.prepare(`INSERT INTO workspaces(user_id,state_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at`)
    .bind(u.id, JSON.stringify(safe), nowIso()).run();
  await audit(env, u, 'WORKSPACE_SYNC', 'State saved');
  return json({ ok: true, state: safe });
}
