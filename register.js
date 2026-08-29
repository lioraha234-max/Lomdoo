import { hashNewPassword, jsonResponse, normalizeUsername } from '../_lib/auth.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const rawUsername = body.username;
    const password = body.password;
    const username = normalizeUsername(rawUsername);

    if (!username || username.length < 3) {
      return jsonResponse({ error: 'שם משתמש חייב להיות לפחות 3 תווים' }, 400);
    }
    if (!/^[a-z0-9_.\-]+$/i.test(username)) {
      return jsonResponse({ error: 'שם משתמש יכול להכיל רק אותיות/ספרות באנגלית, קו תחתון, נקודה או מקף' }, 400);
    }
    if (!password || password.length < 6) {
      return jsonResponse({ error: 'הסיסמה חייבת להיות לפחות 6 תווים' }, 400);
    }
    if (!env.LOMDOO_KV) {
      return jsonResponse({ error: 'האחסון בענן לא מוגדר בפרויקט (חסר KV binding בשם LOMDOO_KV)' }, 500);
    }

    const userKey = 'user:' + username;
    const existing = await env.LOMDOO_KV.get(userKey);
    if (existing) {
      return jsonResponse({ error: 'שם המשתמש הזה כבר תפוס' }, 409);
    }

    const { hash, salt } = await hashNewPassword(password);
    await env.LOMDOO_KV.put(userKey, JSON.stringify({
      username: String(rawUsername).trim(),
      hash, salt,
      createdAt: new Date().toISOString()
    }));

    const token = crypto.randomUUID();
    await env.LOMDOO_KV.put('session:' + token, username, { expirationTtl: SESSION_TTL_SECONDS });

    return jsonResponse({ token, username: String(rawUsername).trim() });
  } catch (e) {
    return jsonResponse({ error: 'שגיאת שרת בהרשמה' }, 500);
  }
}
