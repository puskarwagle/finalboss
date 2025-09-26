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
  const token = cookies.get('session_token');
  if (!token) return null;

  const sessionData = parseSessionToken(token);
  if (!validateSession(sessionData)) {
    return null;
  }

  return sessionData;
}