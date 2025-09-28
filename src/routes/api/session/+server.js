import { json } from '@sveltejs/kit';
import { getSessionFromCookies } from '$lib/session.js';

/**
 * GET /api/session
 * Returns the current user session information including API key
 */
export async function GET({ cookies }) {
  try {
    // Get session from cookies
    const sessionData = getSessionFromCookies(cookies);

    if (!sessionData) {
      return json({
        success: false,
        error: 'No valid session found',
        data: null
      }, { status: 401 });
    }

    // For now, we'll return a mock API key
    // In production, you'd want to store and retrieve actual API keys per user
    const apiKey = process.env.OPENAI_API_KEY || 'mock-api-key';

    return json({
      success: true,
      data: {
        user: {
          id: sessionData.id,
          email: sessionData.email,
          name: sessionData.name,
          picture: sessionData.picture,
          provider: sessionData.provider
        },
        apiKey: apiKey
      }
    });

  } catch (error) {
    console.error('Session API error:', error);
    return json({
      success: false,
      error: 'Internal server error',
      data: null
    }, { status: 500 });
  }
}