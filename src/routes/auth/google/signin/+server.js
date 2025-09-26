import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
const BASE_URL = dev ? 'http://localhost:1420' : 'https://yourdomain.com';

export async function GET() {
  // Generate state for security
  const state = Math.random().toString(36).substring(2, 15);

  // Google OAuth 2.0 authorization URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.append('redirect_uri', `${BASE_URL}/auth/google/callback`);
  googleAuthUrl.searchParams.append('response_type', 'code');
  googleAuthUrl.searchParams.append('scope', 'openid profile email');
  googleAuthUrl.searchParams.append('state', state);

  // Store state in cookies for verification
  const headers = new Headers();
  headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
  headers.append('Location', googleAuthUrl.toString());

  return new Response(null, {
    status: 302,
    headers
  });
}

export async function POST() {
  // Same as GET for OAuth initiation
  return GET();
}