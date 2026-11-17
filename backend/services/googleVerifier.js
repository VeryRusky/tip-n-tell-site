import { OAuth2Client } from 'google-auth-library'

// Checks a "Sign in with Google" ID token and returns what Google says about the person:
// { email, email_verified, ... }. It throws if the token is fake, expired, or was made
// for a different website (audience = our Google client ID).
//
// It lives in its own file so the tests can replace it with a pretend version.
const client = new OAuth2Client()

export async function verifyGoogleToken(idToken, clientId) {
  const ticket = await client.verifyIdToken({ idToken, audience: clientId })
  return ticket.getPayload()
}
