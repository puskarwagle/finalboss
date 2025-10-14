/**
 * API Client for Corpus RAG API
 * Handles authentication and API calls to the backend
 */

import * as fs from 'fs';
import * as path from 'path';

interface ApiConfig {
  baseUrl: string;
}

/**
 * Get API configuration from environment
 */
function getApiConfig(): ApiConfig {
  return {
    baseUrl: process.env.API_BASE || 'http://localhost:3000',
  };
}

/**
 * Get session token from the shared cache.
 * The UI process is responsible for keeping this token valid.
 */
async function getSessionToken(): Promise<string | null> {
  const tokenCachePath = path.join(process.cwd(), '.cache', 'api_token.txt');

  if (fs.existsSync(tokenCachePath)) {
    const cachedToken = fs.readFileSync(tokenCachePath, 'utf8').trim();
    if (cachedToken) {
      console.log('✅ Using shared authentication token for bot process.');
      return cachedToken;
    }
  }

  console.log('ℹ️ No shared authentication token available for bot process.');
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

// The save and clear functions are kept for potential direct use or testing,
// but the primary flow is now managed by the UI via Tauri IPC.

/**
 * Save authentication token to cache
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
