import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { invoke } from '@tauri-apps/api/core';

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'freetier' | 'premium' | 'admin';
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
}

const API_BASE_URL = 'http://localhost:3000';
const TOKEN_CACHE_FILE = '.cache/api_token.txt';

function createAuthStore() {
  const { subscribe, set, update }: Writable<AuthState> = writable({
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
        await logout();
        return null;
      }
    } catch (error) {
      console.error('Error refreshing access token:', error);
      await logout();
      return null;
    }
  }

  async function setTokens(data: any) {
    if (!browser) return;
    const { accessToken, refreshToken, expiresIn, user } = data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const expiresAt = new Date().getTime() + expiresIn * 1000;
    localStorage.setItem('expiresAt', expiresAt.toString());

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    try {
      await invoke('write_file_async', { filename: TOKEN_CACHE_FILE, content: accessToken });
      console.log('✅ Token saved to shared cache for bot processes.');
    } catch (e) {
      console.error('Failed to save token to shared cache:', e);
    }
  }

  async function signup(email: string, password: string, name: string, rememberMe = true) {
    update(state => ({ ...state, loading: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (browser) {
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('accessToken', data.token);
          storage.setItem('user', JSON.stringify(data.user));
          const expiresAt = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
          storage.setItem('expiresAt', expiresAt.toString());
          storage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        }

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
        console.log('✅ Signup successful');
        return { success: true };
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      update(state => ({ ...state, loading: false, user: null, isLoggedIn: false }));
      return { success: false, error: (error as Error).message };
    }
  }

  async function login(email: string, password: string, rememberMe = true) {
    update(state => ({ ...state, loading: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (browser) {
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('accessToken', data.token);
          storage.setItem('user', JSON.stringify(data.user));
          const expiresAt = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
          storage.setItem('expiresAt', expiresAt.toString());
          storage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        }

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
        return { success: true };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      update(state => ({ ...state, loading: false, user: null, isLoggedIn: false }));
      return { success: false, error: (error as Error).message };
    }
  }

  async function logout() {
    if (!browser) return;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('expiresAt');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('rememberMe');

    set({ user: null, isLoggedIn: false, loading: false });

    try {
      await invoke('delete_file_async', { filename: TOKEN_CACHE_FILE });
      console.log('✅ Cleared shared token cache.');
    } catch (e) {
      console.log('Could not clear shared token cache (it may not exist):', e);
    }

    console.log('Logged out.');
    goto('/login');
  }

  async function getAccessToken() {
    if (!browser) return null;

    const expiresAt = localStorage.getItem('expiresAt') || sessionStorage.getItem('expiresAt');
    const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

    if (!accessToken || !expiresAt) {
      return null;
    }

    if (new Date().getTime() > parseInt(expiresAt) - 60 * 1000) {
      console.log('Access token expired or nearing expiration, refreshing...');
      return await refreshAccessToken();
    }

    return accessToken;
  }

  async function initialize() {
    if (!browser) return;

    let token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    let userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    let expiresAt = localStorage.getItem('expiresAt') || sessionStorage.getItem('expiresAt');
    const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;

    if (token && userStr && expiresAt) {
      const now = new Date().getTime();
      const expiry = parseInt(expiresAt);

      if (now < expiry) {
        try {
          const user: User = JSON.parse(userStr);
          set({ user, isLoggedIn: true, loading: false });
        } catch (e) {
          console.error('Failed to parse user data:', e);
          await logout();
        }
      } else {
        console.log('Session expired, clearing auth state');
        storage.removeItem('accessToken');
        storage.removeItem('user');
        storage.removeItem('expiresAt');
        storage.removeItem('rememberMe');
        set({ user: null, isLoggedIn: false, loading: false });
      }
    } else {
      set({ user: null, isLoggedIn: false, loading: false });
    }
  }

  return {
    subscribe,
    signup,
    login,
    logout,
    getAccessToken,
    initialize,
  };
}

export const authService = createAuthStore();


