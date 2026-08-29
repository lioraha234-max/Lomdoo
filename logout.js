import { getBearerToken, jsonResponse } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const token = getBearerToken(request);
  if (token && env.LOMDOO_KV) {
    await env.LOMDOO_KV.delete('session:' + token);
  }
  return jsonResponse({ ok: true });
}
