/**
 * OAuth Callback Handler for Corpus-RAG Integration
 * Handles the redirect from Google OAuth and exchanges code for session token
 */

import { redirect } from '@sveltejs/kit';

// Server-side uses regular process.env (no VITE_ prefix needed)
const CORPUS_RAG_API_URL = process.env.CORPUS_RAG_API_URL || process.env.VITE_CORPUS_RAG_API_URL || 'http://localhost:3000/api';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET;

export async function GET({ url, cookies }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  // Check for OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error);
    return redirect(302, '/login?error=oauth_failed');
  }
  
  if (!code || !state) {
    console.error('❌ Missing code or state parameter');
    return redirect(302, '/login?error=missing_params');
  }
  
  try {
    console.log('🔐 Processing OAuth callback...');
    
    // Exchange authorization code for tokens
    const redirectUri = `${url.origin}/auth/corpus-rag/callback`;
    
    console.log('🔄 Exchanging code for access token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Token exchange failed:', errorData);
      return redirect(302, '/login?error=token_exchange_failed');
    }
    
    const tokens = await tokenResponse.json();
    console.log('✅ Got access token');
    
    // Get user info from Google
    console.log('🔄 Fetching user info...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      console.error('❌ Failed to get user info');
      return redirect(302, '/login?error=userinfo_failed');
    }
    
    const userInfo = await userInfoResponse.json();
    console.log('✅ Got user info:', userInfo.email);
    
    // Login to corpus-rag
    console.log('🔄 Logging in to corpus-rag...');
    const loginResponse = await fetch(`${CORPUS_RAG_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: tokens.id_token,
        userInfo: userInfo
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok || !loginData.success) {
      console.error('❌ Corpus-RAG login failed:', loginData.error);
      
      // Check if user is not authorized
      if (loginData.error && loginData.error.includes('Access denied')) {
        return redirect(302, '/login?error=access_denied');
      }
      
      return redirect(302, '/login?error=login_failed');
    }
    
    console.log('✅ Logged in to corpus-rag successfully');
    
    // Set cookies for server-side access
    cookies.set('corpus_rag_token', loginData.token, {
      path: '/',
      httpOnly: false,  // Allow JS access
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,  // 7 days
      secure: process.env.NODE_ENV === 'production'
    });
    
    cookies.set('corpus_rag_user', JSON.stringify(loginData.user), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Clear OAuth state cookie
    cookies.delete('oauth_state', { path: '/' });
    
    // Redirect to app
    return redirect(302, '/app');
    
  } catch (error) {
    // SvelteKit's redirect() throws an error - we need to re-throw it
    if (error?.status >= 300 && error?.status < 400) {
      throw error;
    }
    
    console.error('❌ OAuth callback error:', error);
    return redirect(302, '/login?error=auth_failed');
  }
}

