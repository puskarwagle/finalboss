/**
 * API Client for Corpus RAG API
 * Handles authentication and API calls to the backend
 */

import * as fs from 'fs';
import * as path from 'path';

interface ApiConfig {
  baseUrl: string;
  userEmail: string;
}

/**
 * Get API configuration from environment
 */
function getApiConfig(): ApiConfig {
  return {
    baseUrl: process.env.API_BASE || 'http://localhost:3000',
    userEmail: process.env.USER_EMAIL || ''
  };
}

/**
 * Get or create session token for API calls
 * For now, we'll skip auth and add it later when needed
 * The API docs show it's required, but we can implement it when you set up Google OAuth
 */
async function getSessionToken(): Promise<string | null> {
  const config = getApiConfig();

  // Check if we have a cached token
  const tokenCachePath = path.join(process.cwd(), '.cache', 'api_token.txt');

  if (fs.existsSync(tokenCachePath)) {
    const cachedToken = fs.readFileSync(tokenCachePath, 'utf8').trim();

    // Verify token is still valid by making a test request
    try {
      const testResponse = await fetch(`${config.baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${cachedToken}` }
      });

      if (testResponse.ok) {
        console.log('✅ Using cached authentication token');
        return cachedToken;
      }
    } catch (error) {
      console.log('⚠️ Cached token expired or invalid');
    }
  }

  console.log('ℹ️ No authentication token available');
  console.log('ℹ️ API calls will proceed without authentication');
  console.log('ℹ️ Add SESSION_TOKEN to .env if you need authenticated access');

  return null;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest(
  endpoint: string,
  method: string = 'POST',
  body?: any
): Promise<any> {
  const config = getApiConfig();
  const token = await getSessionToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Add auth header if we have a token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${config.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Save authentication token to cache
 * Use this if you get a token from Google OAuth login
 */
export function saveSessionToken(token: string): void {
  const cacheDir = path.join(process.cwd(), '.cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const tokenCachePath = path.join(cacheDir, 'api_token.txt');
  fs.writeFileSync(tokenCachePath, token, 'utf8');
  console.log('✅ Session token saved to cache');
}

/**
 * Clear cached session token
 */
export function clearSessionToken(): void {
  const tokenCachePath = path.join(process.cwd(), '.cache', 'api_token.txt');
  if (fs.existsSync(tokenCachePath)) {
    fs.unlinkSync(tokenCachePath);
    console.log('✅ Session token cleared');
  }
}
