const { isEmail, supabaseFetch, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Invalid request.' }); }
  const { name, email, subject, message } = body;
  if (!name || !isEmail(email) || !message) {
    return json(400, { ok: false, error: 'Please fill in your name, a valid email, and a message.' });
  }
  const res = await supabaseFetch('contact_messages', {
    method: 'POST',
    body: JSON.stringify({ name, email, subject: subject || null, message }),
  });
  if (!res.ok) return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  return json(200, { ok: true, message: "Thanks — we'll get back to you soon." });
};
