import { json, auth, readJson, roleAllowed, audit, nowIso } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const u = await auth(request, env);
  if (!u) return json({ error: 'Login required' }, 401);
  if (!roleAllowed(u, ['owner','admin','marketer','creator'])) return json({ error: 'Role not allowed' }, 403);
  const b = await readJson(request);
  const row = await env.DB.prepare('SELECT state_json FROM workspaces WHERE user_id=?1').bind(u.id).first();
  const w = row ? JSON.parse(row.state_json) : { workspace: { role: u.role }, tasks: [] };
  w.tasks = Array.isArray(w.tasks) ? w.tasks : [];
  const task = { ...b, id: Date.now(), created: nowIso(), createdBy: u.id };
  w.tasks.push(task);
  await env.DB.prepare(`INSERT INTO workspaces(user_id,state_json,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at`)
    .bind(u.id, JSON.stringify(w), nowIso()).run();
  await audit(env, u, 'TASK_CREATED', b.title || 'untitled');
  return json({ ok: true, task }, 201);
}
