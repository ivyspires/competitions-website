/**
 * GLRC site Worker
 * Serves the static site (via ASSETS binding) and handles:
 *  - POST /api/contact
 *  - POST /api/newsletter
 *  - POST /api/school-registration
 *  - POST /api/school-partnership
 *  - POST /api/signup     (creates a user account: participant/teacher/ambassador/school)
 *  - POST /api/login
 *  - POST /api/logout
 *  - GET  /account        (server-rendered account page, reads the session cookie)
 */

const SESSION_COOKIE = "glrc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes.buffer;
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: bufToHex(bits), salt: saltHex || bufToHex(salt) };
}

async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await hashPassword(password, saltHex);
  return timingSafeEqual(hash, hashHex);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmac(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return bufToHex(sig);
}

async function makeSessionCookie(userId, role, secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${role}.${expires}`;
  const sig = await hmac(payload, secret);
  const value = `${payload}.${sig}`;
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

async function verifySession(request, secret) {
  const cookies = parseCookies(request);
  const value = cookies[SESSION_COOKIE];
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [userId, role, expires, sig] = parts;
  const payload = `${userId}.${role}.${expires}`;
  const expectedSig = await hmac(payload, secret);
  if (!timingSafeEqual(sig, expectedSig)) return null;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return null;
  return { userId: Number(userId), role };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });
}

function isEmail(str) {
  return typeof str === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

async function readForm(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return await request.json();
  }
  const form = await request.formData();
  const out = {};
  for (const [k, v] of form.entries()) out[k] = v;
  return out;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleContact(request, env) {
  const body = await readForm(request);
  const { name, email, subject, message } = body;
  if (!name || !isEmail(email) || !message) {
    return json({ ok: false, error: "Please fill in your name, a valid email, and a message." }, { status: 400 });
  }
  await env.DB.prepare(
    "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)"
  ).bind(name, email, subject || null, message).run();
  return json({ ok: true, message: "Thanks — we'll get back to you soon." });
}

async function handleNewsletter(request, env) {
  const body = await readForm(request);
  const { email } = body;
  if (!isEmail(email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  try {
    await env.DB.prepare("INSERT INTO newsletter_subscribers (email) VALUES (?)").bind(email).run();
    return json({ ok: true, message: "Subscribed! Check your inbox for updates." });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return json({ ok: true, message: "You're already subscribed." });
    }
    return json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function handleSchoolRegistration(request, env) {
  const body = await readForm(request);
  const { school_name, country, coordinator_name, coordinator_email, student_count } = body;
  if (!school_name || !coordinator_name || !isEmail(coordinator_email)) {
    return json({ ok: false, error: "Please fill in the school name, coordinator name, and a valid coordinator email." }, { status: 400 });
  }
  await env.DB.prepare(
    "INSERT INTO school_registrations (school_name, country, coordinator_name, coordinator_email, student_count) VALUES (?, ?, ?, ?, ?)"
  ).bind(school_name, country || null, coordinator_name, coordinator_email, student_count || null).run();
  return json({ ok: true, message: "Request received — we'll review and follow up within two business days." });
}

async function handleSchoolPartnership(request, env) {
  const body = await readForm(request);
  const { school_name, contact_name, email } = body;
  if (!school_name || !contact_name || !isEmail(email)) {
    return json({ ok: false, error: "Please fill in the school name, your name, and a valid email." }, { status: 400 });
  }
  await env.DB.prepare(
    "INSERT INTO school_partnerships (school_name, contact_name, email) VALUES (?, ?, ?)"
  ).bind(school_name, contact_name, email).run();
  return json({ ok: true, message: "Thanks — our partnerships team will be in touch." });
}

async function handleSignup(request, env) {
  const body = await readForm(request);
  const { name, email, password, role, organization } = body;
  const validRoles = ["participant", "teacher", "ambassador", "school"];
  if (!name || !isEmail(email) || !password || password.length < 8 || !validRoles.includes(role)) {
    return json(
      { ok: false, error: "Please provide your name, a valid email, a password of at least 8 characters, and a role." },
      { status: 400 }
    );
  }
  const { hash, salt } = await hashPassword(password);
  try {
    const result = await env.DB.prepare(
      "INSERT INTO users (name, email, password_hash, salt, role, organization) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(name, email, hash, salt, role, organization || null).run();
    const userId = result.meta.last_row_id;
    const cookie = await makeSessionCookie(userId, role, env.SESSION_SECRET);
    return json({ ok: true, redirect: "/account" }, { headers: { "Set-Cookie": cookie } });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return json({ ok: false, error: "An account with this email already exists." }, { status: 409 });
    }
    return json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function handleLogin(request, env) {
  const body = await readForm(request);
  const { email, password } = body;
  if (!isEmail(email) || !password) {
    return json({ ok: false, error: "Please enter your email and password." }, { status: 400 });
  }
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    return json({ ok: false, error: "No account found with that email." }, { status: 401 });
  }
  const valid = await verifyPassword(password, user.password_hash, user.salt);
  if (!valid) {
    return json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }
  const cookie = await makeSessionCookie(user.id, user.role, env.SESSION_SECRET);
  return json({ ok: true, redirect: "/account" }, { headers: { "Set-Cookie": cookie } });
}

async function handleLogout() {
  return json({ ok: true, redirect: "/" }, { headers: { "Set-Cookie": clearSessionCookie() } });
}

async function handleAccount(request, env) {
  const session = await verifySession(request, env.SESSION_SECRET);
  if (!session) {
    return Response.redirect(new URL("/login.html", request.url).toString(), 302);
  }
  const user = await env.DB.prepare("SELECT id, name, email, role, organization, created_at FROM users WHERE id = ?")
    .bind(session.userId)
    .first();
  if (!user) {
    return Response.redirect(new URL("/login.html", request.url).toString(), 302);
  }
  const roleLabels = { participant: "Participant", teacher: "Teacher", ambassador: "Ambassador", school: "School" };
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
      ${user.organization ? `<p><strong>School / organization:</strong> ${escapeHtml(user.organization)}</p>` : ""}
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
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    try {
      if (method === "POST" && pathname === "/api/contact") return await handleContact(request, env);
      if (method === "POST" && pathname === "/api/newsletter") return await handleNewsletter(request, env);
      if (method === "POST" && pathname === "/api/school-registration") return await handleSchoolRegistration(request, env);
      if (method === "POST" && pathname === "/api/school-partnership") return await handleSchoolPartnership(request, env);
      if (method === "POST" && pathname === "/api/signup") return await handleSignup(request, env);
      if (method === "POST" && pathname === "/api/login") return await handleLogin(request, env);
      if (method === "POST" && pathname === "/api/logout") return await handleLogout();
      if (method === "GET" && pathname === "/account") return await handleAccount(request, env);
    } catch (err) {
      return json({ ok: false, error: "Server error. Please try again." }, { status: 500 });
    }

    // Everything else falls through to the static site
    return env.ASSETS.fetch(request);
  },
};
