const { verifySession, escapeHtml, supabaseFetch } = require('./lib/auth');

exports.handler = async (event) => {
  const session = verifySession(event.headers.cookie, process.env.SESSION_SECRET);
  if (!session) return { statusCode: 302, headers: { Location: '/login.html' }, body: '' };

  const res = await supabaseFetch(
    `users?id=eq.${session.userId}&select=id,name,email,role,organization,created_at`,
    { method: 'GET' }
  );
  if (!res.ok) return { statusCode: 302, headers: { Location: '/login.html' }, body: '' };
  const rows = await res.json();
  const user = rows[0];
  if (!user) return { statusCode: 302, headers: { Location: '/login.html' }, body: '' };

  const roleLabels = { participant: 'Participant', teacher: 'Teacher', ambassador: 'Ambassador', school: 'School' };
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Account | Global Reasoning Challenge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<div class="placeholder-note">Sample layout inspired by international student-competition sites &mdash; all names, dates, and figures are placeholders.</div>
<div class="announcement-bar">Qualification Round deadline: <strong>6 September 2026</strong> &mdash; <a href="/rounds.html#compete">register free &#8594;</a></div>
<header class="site-nav">
  <div class="nav-inner">
    <a href="/index.html" class="brand">
      <span class="brand-mark">GR</span>
      <span>GRC <small>GLOBAL REASONING CHALLENGE</small></span>
    </a>
  </div>
</header>
<section class="page-hero">
  <div class="container">
    <div class="breadcrumb"><a href="/index.html">Home</a> / My Account</div>
    <span class="eyebrow">${roleLabels[user.role] || user.role}</span>
    <h1>Welcome, ${escapeHtml(user.name)}</h1>
    <p>You're signed in as ${escapeHtml(user.email)}.</p>
  </div>
</section>
<section>
  <div class="container">
    <div class="card" style="max-width: 32rem;">
      <h3>Account details</h3>
      <p><strong>Name:</strong> ${escapeHtml(user.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
      <p><strong>Role:</strong> ${roleLabels[user.role] || user.role}</p>
      ${user.organization ? `<p><strong>School / organization:</strong> ${escapeHtml(user.organization)}</p>` : ''}
      <p><strong>Member since:</strong> ${escapeHtml(user.created_at)}</p>
      <button type="button" class="btn btn-outline" id="logoutBtn" style="margin-top: 1rem;">Log out</button>
    </div>
  </div>
</section>
<footer>
  <div class="container">
    <div class="foot-bottom">
      <span>&copy; 2026 Global Reasoning Challenge. Sample layout for reference only.</span>
    </div>
  </div>
</footer>
<script>
document.getElementById('logoutBtn').addEventListener('click', async function(){
  await fetch('/api/logout', { method: 'POST' });
  window.location = '/index.html';
});
</script>
</body>
</html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html };
};
