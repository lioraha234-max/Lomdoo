// Shared helpers for Lomdoo's Cloudflare Pages Functions.
// Password hashing uses PBKDF2 (Web Crypto, available in the Workers runtime).

export function bytesToHex(bytes) {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

async function deriveBits(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

export async function hashNewPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt);
  return { hash: bytesToHex(bits), salt: bytesToHex(salt) };
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const salt = hexToBytes(saltHex);
  const bits = await deriveBits(password, salt);
  const computed = bytesToHex(bits);
  if (computed.length !== expectedHashHex.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  return diff === 0;
}

export function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer (.+)$/);
  return m ? m[1] : null;
}

export async function getUsernameFromToken(env, token) {
  if (!token) return null;
  return await env.LOMDOO_KV.get('session:' + token);
}

export function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}
