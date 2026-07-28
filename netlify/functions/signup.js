const { isEmail, hashPassword, makeSessionCookie, supabaseFetch, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Invalid request.' }); }
  const { name, email, password, role, organization } = body;
  const validRoles = ['participant', 'teacher', 'ambassador', 'school'];
  if (!name || !isEmail(email) || !password || password.length < 8 || !validRoles.includes(role)) {
    return json(400, {
      ok: false,
      error: 'Please provide your name, a valid email, a password of at least 8 characters, and a role.',
    });
  }
  const { hash, salt } = hashPassword(password);
  const res = await supabaseFetch('users', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name, email, password_hash: hash, salt, role, organization: organization || null }),
  });
  if (res.status === 409) return json(409, { ok: false, error: 'An account with this email already exists.' });
  if (!res.ok) return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  const rows = await res.json();
  const userId = rows[0].id;
  const cookie = makeSessionCookie(userId, role, process.env.SESSION_SECRET);
  return json(200, { ok: true, redirect: '/account' }, { 'Set-Cookie': cookie });
};
