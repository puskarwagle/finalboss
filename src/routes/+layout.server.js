
export async function load({ cookies }) {
  // This function no longer needs to load session data from cookies
  // as authentication is now handled on the client-side with JWTs.
  return {};
}