import { json } from './_utils.js';
export async function onRequestPost() {
  return json({ analysis: null, mode: 'local', message: 'Gemini connector is not configured in the free Cloudflare edition.' });
}
