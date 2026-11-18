// Decides whether a login session still belongs to the owner.
//
// A session remembers how it was made: { email, via: 'google' } or { email, via: 'dev' }.
// It is only accepted when:
//   - Google sessions: the email is still the current ADMIN_EMAIL (so changing ADMIN_EMAIL
//     ends the old owner's sessions at once);
//   - dev sessions: the dev login is switched on in this server (never in production) and
//     the email is the dev email. A dev session made on a laptop can therefore never be
//     used on the live site, even if both share a database.
// Older sessions without `via` are not accepted.
export function isOwnerSession(admin, config) {
  if (!admin || typeof admin.email !== 'string') return false
  if (admin.via === 'google') {
    return config.adminEmail !== '' && admin.email === config.adminEmail
  }
  if (admin.via === 'dev') {
    return !config.isProduction && config.devLogin && admin.email === config.devEmail
  }
  return false
}

// Ends a session that is no longer accepted, then calls done().
export function endSession(req, done) {
  req.session.destroy(() => done())
}
