import { json, auth } from '../_utils.js';
export async function onRequestGet({ request, env }) {
  const u = await auth(request, env);
  return json({ authenticated: !!u, user: u || null });
}
