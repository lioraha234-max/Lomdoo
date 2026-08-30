import { getBearerToken, getUsernameFromToken, jsonResponse } from '../_lib/auth.js';

// Server-side proxy to the Claude API. The API key lives only here (as a
// Cloudflare secret), never in the browser. Requires a logged-in user so
// random visitors can't run up the site owner's API bill.
export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'מפתח Claude API לא מוגדר בפרויקט (חסר secret בשם ANTHROPIC_API_KEY)' }, 500);
  }
  const token = getBearerToken(request);
  const username = await getUsernameFromToken(env, token);
  if (!username) {
    return jsonResponse({ error: 'צריך להתחבר לחשבון כדי להשתמש בכלי ה-AI' }, 401);
  }

  let body;
  try { body = await request.json(); } catch (e) { return jsonResponse({ error: 'גוף בקשה לא תקין' }, 400); }
  if (!Array.isArray(body.messages) || !body.messages.length) {
    return jsonResponse({ error: 'חסרות הודעות בבקשה' }, 400);
  }

  const payload = {
    model: 'claude-sonnet-5',
    max_tokens: Math.min(body.max_tokens || 4000, 4096),
    messages: body.messages
  };
  if (body.system) payload.system = body.system;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = (data.error && data.error.message) || 'שגיאה מ-Claude API';
      return jsonResponse({ error: msg }, res.status);
    }
    return jsonResponse(data);
  } catch (e) {
    return jsonResponse({ error: 'לא ניתן להתחבר ל-Claude API' }, 502);
  }
}
