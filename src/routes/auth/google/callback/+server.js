import { json, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { isUserAuthorized } from '$lib/auth-check.js';
import { API_CONFIG } from '$lib/api-config.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';
const BASE_URL = API_CONFIG.BASE_URL;

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');

  // Verify state to prevent CSRF attacks
  if (!state || state !== storedState) {
    return redirect(302, '/login?error=invalid_state');
  }

  if (!code) {
    return redirect(302, '/login?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${BASE_URL}/auth/google/callback`
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const tokens = await tokenResponse.json();

    // Get user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to get user profile');
    }

    const profile = await profileResponse.json();

    // Check if user is authorized
    if (!isUserAuthorized(profile.email)) {
      return redirect(302, '/unauthorized');
    }

    // Create session token (you can use JWT here)
    const sessionToken = btoa(JSON.stringify({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      provider: 'google',
      timestamp: Date.now()
    }));

    // Set session cookie (removed HttpOnly so JavaScript can access it for API calls)
    const headers = new Headers();
    headers.append('Set-Cookie', `session_token=${sessionToken}; Path=/; SameSite=Lax; Max-Age=86400`);
    headers.append('Set-Cookie', `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`); // Clear state
    headers.append('Location', '/app');

    return new Response(null, {
      status: 302,
      headers
    });

  } catch (error) {
    // SvelteKit's redirect() throws an error - we need to re-throw it
    if (error?.status >= 300 && error?.status < 400) {
      throw error;
    }
    
    console.error('OAuth callback error:', error);
    return redirect(302, '/login?error=oauth_failed');
  }
}