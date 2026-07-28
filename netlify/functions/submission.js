const { isEmail, supabaseFetch, json } = require('./lib/auth');

const MIN_YEAR = 1900;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'Invalid request.' }); }

  const { fullName, dobDay, dobMonth, dobYear, country, email, answers } = body;

  const day = parseInt(dobDay, 10);
  const month = parseInt(dobMonth, 10);
  const year = parseInt(dobYear, 10);
  const currentYear = new Date().getFullYear();

  if (!fullName || fullName.trim().length < 2) {
    return json(400, { ok: false, error: 'Please enter your full name.' });
  }
  if (!day || day < 1 || day > 31 || !month || month < 1 || month > 12 || !year || year < MIN_YEAR || year > currentYear) {
    return json(400, { ok: false, error: 'Please enter a valid date of birth.' });
  }
  if (!country) {
    return json(400, { ok: false, error: 'Please select your country.' });
  }
  if (!isEmail(email)) {
    return json(400, { ok: false, error: 'Please enter a valid email address.' });
  }
  if (!answers || answers.trim().length < 10) {
    return json(400, { ok: false, error: 'Please include your answers before submitting.' });
  }

  const res = await supabaseFetch('submissions', {
    method: 'POST',
    body: JSON.stringify({
      full_name: fullName.trim(),
      dob_day: day,
      dob_month: month,
      dob_year: year,
      country,
      email,
      answers: answers.trim(),
    }),
  });
  if (!res.ok) return json(500, { ok: false, error: 'Something went wrong. Please try again.' });
  return json(200, { ok: true, message: 'Your solution has been submitted. Good luck!' });
};
