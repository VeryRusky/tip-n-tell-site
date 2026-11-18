// Turns any error into a short JSON answer. Visitors never see stack traces or
// internal details; the server log gets a short note for real (500) errors.
// Nothing from the request (cookies, tokens, body) is logged.

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' })
}

// Express knows this is an error handler because it has four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  // Errors we threw on purpose (BadRequest) and body-parser errors carry a status.
  let status = Number(error.status || error.statusCode) || 500
  if (status < 400 || status > 599) status = 500

  if (status >= 500) {
    // Database validation messages can quote the value that failed (e.g. a customer's
    // name), so for those only the kind of error is logged.
    const detail = ['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)
      ? error.name
      : error.message
    console.error(`[error] ${req.method} ${req.path}: ${detail}`)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }

  let message = 'That request could not be handled.'
  if (error.type === 'entity.too.large') message = 'That request is too large.'
  else if (error.type === 'entity.parse.failed') message = 'That request could not be read.'
  else if (error.name === 'BadRequest') message = error.message
  res.status(status).json({ error: message })
}
