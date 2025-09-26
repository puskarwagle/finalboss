import { getSessionFromCookies } from '$lib/session.js';

export async function load({ cookies }) {
  const sessionData = getSessionFromCookies(cookies);

  return {
    session: sessionData ? {
      user: {
        id: sessionData.id,
        email: sessionData.email,
        name: sessionData.name,
        image: sessionData.picture
      },
      provider: sessionData.provider
    } : null
  };
}