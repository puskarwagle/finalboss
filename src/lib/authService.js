import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { invoke } from '@tauri-apps/api/core';

const API_BASE_URL = 'http://localhost:3000'; // As per API.md
const TOKEN_CACHE_FILE = '.cache/api_token.txt';

function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    isLoggedIn: false,
    loading: true,
  });

  async function refreshAccessToken() {
    if (!browser) return null;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.log('No refresh token available.');
      await logout();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        await setTokens(data);
        console.log('✅ Access token refreshed successfully.');
        return data.accessToken;
      } else {
        console.error('Failed to refresh access token.');
        await logout(); // If refresh fails, log the user out.
        return null;
      }
    } catch (error) {
      console.error('Error refreshing access token:', error);
      await logout();
      return null;
    }
  }

  async function setTokens(data) {
    if (!browser) return;
    const { accessToken, refreshToken, expiresIn, user } = data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    // Store expiry time (current time + expiresIn seconds)
    const expiresAt = new Date().getTime() + expiresIn * 1000;
    localStorage.setItem('expiresAt', expiresAt);

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    // Save the token for bot processes via Tauri IPC
    try {
      await invoke('write_file_async', { filename: TOKEN_CACHE_FILE, content: accessToken });
      console.log('✅ Token saved to shared cache for bot processes.');
    } catch (e) {
      console.error('Failed to save token to shared cache:', e);
    }
  }

  async function loginWithEmail(email) {
    update(state => ({ ...state, loading: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/email-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Simple session-based auth - just store token and user
        if (browser) {
          localStorage.setItem('accessToken', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          // Set a long expiry for session token
          const expiresAt = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours
          localStorage.setItem('expiresAt', expiresAt);
        }

        // Save token for bot processes
        try {
          await invoke('write_file_async', { filename: TOKEN_CACHE_FILE, content: data.token });
          console.log('✅ Token saved to shared cache for bot processes.');
        } catch (e) {
          console.error('Failed to save token to shared cache:', e);
        }

        set({
          user: data.user,
          isLoggedIn: true,
          loading: false,
        });
        console.log('✅ Login successful');
        goto('/app');
        return { success: true };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      update(state => ({ ...state, loading: false, user: null, isLoggedIn: false }));
      return { success: false, error: error.message };
    }
  }

  async function loginWithGoogleCredential(credential) {
    update(state => ({ ...state, loading: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login-jwt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await setTokens(data);
        set({
          user: data.user,
          isLoggedIn: true,
          loading: false,
        });
        console.log('✅ Login successful');
        goto('/app'); // Redirect to the main application page
        return { success: true };
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      update(state => ({ ...state, loading: false, user: null, isLoggedIn: false }));
      return { success: false, error: error.message };
    }
  }

  async function logout() {
    if (!browser) return;

    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('user');

    // Reset store
    set({ user: null, isLoggedIn: false, loading: false });

    // Clear the bot's cached token via Tauri IPC
    try {
      await invoke('delete_file_async', { filename: TOKEN_CACHE_FILE });
      console.log('✅ Cleared shared token cache.');
    } catch (e) {
      // It might fail if the file doesn't exist, which is fine.
      console.log('Could not clear shared token cache (it may not exist):', e);
    }

    console.log('Logged out.');
    goto('/login'); // Redirect to login page
  }

  async function getAccessToken() {
    if (!browser) return null;

    const expiresAt = localStorage.getItem('expiresAt');
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken || !expiresAt) {
      return null;
    }

    // Check if token is expired or close to expiring (e.g., within 60 seconds)
    if (new Date().getTime() > parseInt(expiresAt) - 60 * 1000) {
      console.log('Access token expired or nearing expiration, refreshing...');
      return await refreshAccessToken();
    }

    return accessToken;
  }

  async function initialize() {
    if (!browser) return;
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isLoggedIn: true, loading: false });
        // Proactively refresh token if it's expired
        await getAccessToken();
      } catch (e) {
        await logout();
      }
    } else {
      set({ user: null, isLoggedIn: false, loading: false });
    }
  }

  return {
    subscribe,
    loginWithEmail,
    loginWithGoogleCredential,
    logout,
    getAccessToken,
    initialize,
  };
}

export const authService = createAuthStore();
