import { browser } from '$app/environment';

export function parseSessionToken(token) {
  if (!token) return null;

  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

export function createSessionToken(userData) {
  return btoa(JSON.stringify({
    ...userData,
    timestamp: Date.now()
  }));
}

export function validateSession(sessionData) {
  if (!sessionData) return false;

  // Check if session is expired (24 hours)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const isExpired = Date.now() - sessionData.timestamp > maxAge;

  return !isExpired && sessionData.id && sessionData.email;
}

export function getSessionFromCookies(cookies) {
  // Try to get session_token first (Google OAuth)
  const token = cookies.get('session_token');
  if (token) {
    const sessionData = parseSessionToken(token);
    if (validateSession(sessionData)) {
      return sessionData;
    }
  }

  // Try to get corpus_rag session (corpus-rag OAuth)
  const corpusUser = cookies.get('corpus_rag_user');
  const corpusToken = cookies.get('corpus_rag_token');
  
  if (corpusUser && corpusToken) {
    try {
      const user = JSON.parse(corpusUser);
      // Return in the same format as session_token
      return {
        id: user.id || user._id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        picture: user.picture || user.image,
        provider: 'corpus-rag',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to parse corpus_rag_user:', error);
      return null;
    }
  }

  return null;
}