import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    token: null,
    isLoggedIn: false,
    loading: false
  });

  return {
    subscribe,
    login: async (email, password) => {
      update(state => ({ ...state, loading: true }));
      
      try {
        const response = await fetch('/api/auth?endpoint=login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          if (browser) {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          
          set({
            user: data.user,
            token: data.token,
            isLoggedIn: true,
            loading: false
          });
          
          return { success: true, data };
        } else {
          update(state => ({ ...state, loading: false }));
          return { success: false, error: data.message || 'Login failed' };
        }
      } catch (error) {
        update(state => ({ ...state, loading: false }));
        return { success: false, error: 'Network error. Please try again.' };
      }
    },
    
    logout: async () => {
      const token = browser ? localStorage.getItem('auth_token') : null;
      
      if (token) {
        try {
          await fetch('/api/auth?endpoint=logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ token })
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      }

      if (browser) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
      
      set({
        user: null,
        token: null,
        isLoggedIn: false,
        loading: false
      });
    },
    
    checkAuth: async () => {
      if (!browser) return;
      
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          loading: false
        });
        return;
      }

      try {
        const response = await fetch('/api/auth?endpoint=me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          set({
            user: userData,
            token,
            isLoggedIn: true,
            loading: false
          });
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          set({
            user: null,
            token: null,
            isLoggedIn: false,
            loading: false
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          loading: false
        });
      }
    }
  };
}

export const auth = createAuthStore();