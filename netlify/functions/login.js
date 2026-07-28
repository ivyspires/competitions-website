const { isEmail, verifyPassword, makeSessionCookie, supabaseFetch, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Invalid request.' }); }
  const { email, password } = body;
  if (!isEmail(email) || !password) return json(400, { ok: false, error: 'Please enter your email and password.' });
  const res = await supabaseFetch(`users?email=eq.${encodeURIComponent(email)}`, { method: 'GET' });
  if (!res.ok) return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  const rows = await res.json();
  const user = rows[0];
  if (!user) return json(401, { ok: false, error: 'No account found with that email.' });
  const valid = verifyPassword(password, user.password_hash, user.salt);
  if (!valid) return json(401, { ok: false, error: 'Incorrect password.' });
  const cookie = makeSessionCookie(user.id, user.role, process.env.SESSION_SECRET);
  return json(200, { ok: true, redirect: '/account' }, { 'Set-Cookie': cookie });
};
