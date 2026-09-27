const encoder = new TextEncoder();

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function parseCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  const out = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookieHeader(token) {
  return `v8_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
}

export function clearCookieHeader() {
  return 'v8_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

export async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

export function nowIso() { return new Date().toISOString(); }

export function randomHex(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function pbkdf2(password, saltHex, iterations = 120000) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(x => parseInt(x, 16)));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function auth(request, env) {
  const token = parseCookies(request).v8_session;
  if (!token || !env.DB) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare('SELECT s.user_id, s.expires_at, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?1').bind(tokenHash).first();
  if (!row || Number(row.expires_at) < Date.now()) {
    if (row) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?1').bind(tokenHash).run();
    return null;
  }
  return { id: row.user_id, role: row.role };
}

export function roleAllowed(user, roles) { return !!user && roles.includes(user.role); }

export async function audit(env, actor, action, detail) {
  await env.DB.prepare('INSERT INTO audit(actor_id,role,action,detail,created_at) VALUES(?,?,?,?,?)')
    .bind(actor?.id || 'system', actor?.role || 'system', action, String(detail ?? ''), nowIso()).run();
}

export async function seedUsers(env) {
  const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first();
  if (Number(count?.c || 0) > 0) return;
  const users = [
    ['owner','owner','186df23905f46a702cc126450a26700c','9917f576f24d2e56f99d92acb34b7b502814efc23dd11bf4ad931c661ee31b54'],
    ['admin','admin','b3e3ec2ccbd540425a04f86b0ffcf96a','a4a775501dec2a5c704386facfd84bff3bae377e28657c444fdd3eca245e19a0'],
    ['marketer','marketer','eec0319c145f7bdb33608f1a2bdf0ada','bd80fdc63d376907dc31d21466c18488fb9594516fed796072047ddc5afd0662'],
    ['creator','creator','7f8372b3dbc63472fdc5fc56e77d8907','4a9a640b0642ecb46c0cb30605f9c5e4fa1a35a04eed621d88b4c7359f7f0c81'],
    ['viewer','viewer','d5b491d339593226792580c98a0c4579','97b01fcfd8b82bf5d7279da06da56ddfdff7a344ae17f4960621ba73ad86a85f'],
  ];
  for (const [id, role, salt, hash] of users) {
    await env.DB.prepare('INSERT OR IGNORE INTO users(id,role,salt,password_hash) VALUES(?,?,?,?)').bind(id, role, salt, hash).run();
  }
}
