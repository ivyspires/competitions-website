const { clearSessionCookie, json } = require('./lib/auth');

exports.handler = async () => json(200, { ok: true, redirect: '/' }, { 'Set-Cookie': clearSessionCookie() });
