const { isEmail, supabaseFetch, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Invalid request.' }); }
  const { school_name, country, coordinator_name, coordinator_email, student_count } = body;
  if (!school_name || !coordinator_name || !isEmail(coordinator_email)) {
    return json(400, { ok: false, error: 'Please fill in the school name, coordinator name, and a valid coordinator email.' });
  }
  const res = await supabaseFetch('school_registrations', {
    method: 'POST',
    body: JSON.stringify({
      school_name, country: country || null, coordinator_name, coordinator_email,
      student_count: student_count || null,
    }),
  });
  if (!res.ok) return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  return json(200, { ok: true, message: "Request received — we'll review and follow up within two business days." });
};
