import { verifyPassword, jsonResponse, normalizeUsername } from '../_lib/auth.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const username = normalizeUsername(body.username);
    const password = body.password;

    if (!username || !password) {
      return jsonResponse({ error: 'נא למלא שם משתמש וסיסמה' }, 400);
    }
    if (!env.LOMDOO_KV) {
      return jsonResponse({ error: 'האחסון בענן לא מוגדר בפרויקט (חסר KV binding בשם LOMDOO_KV)' }, 500);
    }

    const raw = await env.LOMDOO_KV.get('user:' + username);
    if (!raw) {
      return jsonResponse({ error: 'שם משתמש או סיסמה שגויים' }, 401);
    }
    const user = JSON.parse(raw);
    const ok = await verifyPassword(password, user.salt, user.hash);
    if (!ok) {
      return jsonResponse({ error: 'שם משתמש או סיסמה שגויים' }, 401);
    }

    const token = crypto.randomUUID();
    await env.LOMDOO_KV.put('session:' + token, username, { expirationTtl: SESSION_TTL_SECONDS });

    return jsonResponse({ token, username: user.username });
  } catch (e) {
    return jsonResponse({ error: 'שגיאת שרת בהתחברות' }, 500);
  }
}
