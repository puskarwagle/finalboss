/**
 * Corpus-RAG Authentication Client
 * Handles Google OAuth flow and session management for corpus-rag integration
 */

import { browser } from '$app/environment';

const CORPUS_RAG_API_URL = import.meta.env.VITE_CORPUS_RAG_API_URL || 'http://localhost:5173/api';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export class CorpusRagAuth {
  
  /**
   * Initiate Google OAuth login flow
   */
  static initiateLogin() {
    if (!browser) return;
    
    const redirectUri = `${window.location.origin}/auth/corpus-rag/callback`;
    const scope = 'openid email profile';
    const state = crypto.randomUUID();
    
    // Store state for validation (CSRF protection)
    sessionStorage.setItem('oauth_state', state);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    
    window.location.href = authUrl.toString();
  }
  
  /**
   * Validate OAuth state parameter (CSRF protection)
   */
  static validateState(state) {
    if (!browser) return false;
    
    const storedState = sessionStorage.getItem('oauth_state');
    sessionStorage.removeItem('oauth_state'); // Clean up
    
    return state === storedState;
  }
  
  /**
   * Exchange authorization code for session token
   */
  static async exchangeCode(code, redirectUri) {
    try {
      console.log('🔄 Exchanging authorization code for token...');
      
      const response = await fetch(`${CORPUS_RAG_API_URL}/auth/exchange-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to exchange code');
      }
      
      console.log('✅ Got access token, logging in to corpus-rag...');
      
      // Now login to corpus-rag with the Google access token
      return await this.loginWithGoogleData(data.data);
      
    } catch (error) {
      console.error('❌ Code exchange error:', error);
      throw error;
    }
  }
  
  /**
   * Login to corpus-rag with Google user data
   */
  static async loginWithGoogleData(googleData) {
    try {
      // Use the access_token to get Google ID token
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${googleData.access_token}`;
      const tokenInfoResponse = await fetch(tokenInfoUrl);
      const tokenInfo = await tokenInfoResponse.json();
      
      // Create a credential (ID token) for corpus-rag login
      // For corpus-rag, we'll use the access token directly
      const response = await fetch(`${CORPUS_RAG_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          credential: googleData.access_token,
          userInfo: googleData.user
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      
      console.log('✅ Logged in to corpus-rag successfully');
      
      // Store session token and user info
      if (browser) {
        localStorage.setItem('corpus_rag_token', data.token);
        localStorage.setItem('corpus_rag_user', JSON.stringify(data.user));
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }
  
  /**
   * Verify current session token
   */
  static async verifySession() {
    const token = browser ? localStorage.getItem('corpus_rag_token') : null;
    
    if (!token) {
      return null;
    }
    
    try {
      const response = await fetch(`${CORPUS_RAG_API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // Token invalid, clear storage
        if (browser) {
          localStorage.removeItem('corpus_rag_token');
          localStorage.removeItem('corpus_rag_user');
        }
        return null;
      }
      
      // Update stored user info
      if (browser) {
        localStorage.setItem('corpus_rag_user', JSON.stringify(data.user));
      }
      
      return data.user;
      
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }
  
  /**
   * Logout from corpus-rag
   */
  static async logout() {
    const token = browser ? localStorage.getItem('corpus_rag_token') : null;
    
    if (token) {
      try {
        await fetch(`${CORPUS_RAG_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    if (browser) {
      localStorage.removeItem('corpus_rag_token');
      localStorage.removeItem('corpus_rag_user');
    }
  }
  
  /**
   * Get current user
   */
  static getCurrentUser() {
    if (!browser) return null;
    
    const userJson = localStorage.getItem('corpus_rag_user');
    return userJson ? JSON.parse(userJson) : null;
  }
  
  /**
   * Get current session token
   */
  static getToken() {
    return browser ? localStorage.getItem('corpus_rag_token') : null;
  }
  
  /**
   * Check if user has specific permission
   */
  static hasPermission(permission) {
    const user = this.getCurrentUser();
    return user && user.apiPermissions && user.apiPermissions[permission];
  }
  
  /**
   * Check if user is premium
   */
  static isPremium() {
    const user = this.getCurrentUser();
    return user && (user.userType === 'premium' || user.userType === 'admin');
  }
  
  /**
   * Check if user is admin
   */
  static isAdmin() {
    const user = this.getCurrentUser();
    return user && user.userType === 'admin';
  }
}

