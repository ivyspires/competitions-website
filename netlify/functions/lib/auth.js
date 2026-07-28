const crypto = require('node:crypto');

const SESSION_COOKIE = 'glrc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return { hash: hash.toString('hex'), salt: salt.toString('hex') };
}

function verifyPassword(password, hashHex, saltHex) {
  const { hash } = hashPassword(password, saltHex);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(hashHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hmac(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqualStr(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function makeSessionCookie(userId, role, secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${role}.${expires}`;
  const sig = hmac(payload, secret);
  const value = `${payload}.${sig}`;
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function verifySession(cookieHeader, secret) {
  const cookies = parseCookies(cookieHeader);
  const value = cookies[SESSION_COOKIE];
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [userId, role, expires, sig] = parts;
  const expected = hmac(`${userId}.${role}.${expires}`, secret);
  if (!safeEqualStr(sig, expected)) return null;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return null;
  return { userId: Number(userId), role };
}

function isEmail(str) {
  return typeof str === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function supabaseFetch(path, options = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

function json(statusCode, data, extraHeaders) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(extraHeaders || {}) },
    body: JSON.stringify(data),
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  hmac,
  makeSessionCookie,
  clearSessionCookie,
  parseCookies,
  verifySession,
  isEmail,
  escapeHtml,
  supabaseFetch,
  json,
  SESSION_COOKIE,
};
