export const handle = async ({ event, resolve }) => {
  // Get session from cookies
  const token = event.cookies.get('corpus_rag_token');
  const userJson = event.cookies.get('corpus_rag_user');
  
  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      event.locals.session = {
        user,
        token
      };
    } catch (error) {
      console.error('Failed to parse user session:', error);
      event.locals.session = null;
    }
  } else {
    event.locals.session = null;
  }
  
  return resolve(event);
}