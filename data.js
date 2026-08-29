import { getBearerToken, getUsernameFromToken, jsonResponse } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!env.LOMDOO_KV) {
    return jsonResponse({ error: 'האחסון בענן לא מוגדר בפרויקט (חסר KV binding בשם LOMDOO_KV)' }, 500);
  }
  const token = getBearerToken(request);
  const username = await getUsernameFromToken(env, token);
  if (!username) return jsonResponse({ error: 'לא מחובר' }, 401);

  const raw = await env.LOMDOO_KV.get('data:' + username);
  const payload = raw ? JSON.parse(raw) : { sets: [], grades: [] };
  return jsonResponse(payload);
}

export async function onRequestPost({ request, env }) {
  if (!env.LOMDOO_KV) {
    return jsonResponse({ error: 'האחסון בענן לא מוגדר בפרויקט (חסר KV binding בשם LOMDOO_KV)' }, 500);
  }
  const token = getBearerToken(request);
  const username = await getUsernameFromToken(env, token);
  if (!username) return jsonResponse({ error: 'לא מחובר' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'גוף בקשה לא תקין' }, 400); }

  const payload = {
    sets: Array.isArray(body.sets) ? body.sets : [],
    grades: Array.isArray(body.grades) ? body.grades : [],
    updatedAt: new Date().toISOString()
  };
  await env.LOMDOO_KV.put('data:' + username, JSON.stringify(payload));
  return jsonResponse({ ok: true, updatedAt: payload.updatedAt });
}
