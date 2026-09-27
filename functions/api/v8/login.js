import { json, readJson, randomHex, sha256Hex, pbkdf2, cookieHeader, audit, seedUsers } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'D1 database binding is missing.' }, 503);
  try {
    await seedUsers(env);
    const b = await readJson(request);
    const username = String(b.username || '');
    const password = String(b.password || '');
    const u = await env.DB.prepare('SELECT id,role,salt,password_hash FROM users WHERE id=?1').bind(username).first();
    if (!u) return json({ ok: false, error: 'Invalid credentials' }, 401);
    const hash = await pbkdf2(password, u.salt);
    if (hash !== u.password_hash) return json({ ok: false, error: 'Invalid credentials' }, 401);
    const token = randomHex(32);
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)')
      .bind(tokenHash, u.id, Date.now() + 604800000, new Date().toISOString()).run();
    await audit(env, { id: u.id, role: u.role }, 'LOGIN', 'Server login');
    return json({ ok: true, user: { id: u.id, role: u.role } }, 200, { 'Set-Cookie': cookieHeader(token) });
  } catch (e) {
    return json({ ok: false, error: 'Login service error', detail: String(e?.message || e) }, 500);
  }
}
