const { isEmail, supabaseFetch, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Invalid request.' }); }
  const { email } = body;
  if (!isEmail(email)) return json(400, { ok: false, error: 'Please enter a valid email address.' });
  const res = await supabaseFetch('newsletter_subscribers', { method: 'POST', body: JSON.stringify({ email }) });
  if (res.status === 409) return json(200, { ok: true, message: "You're already subscribed." });
  if (!res.ok) return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  return json(200, { ok: true, message: 'Subscribed! Check your inbox for updates.' });
};
