import { redirect } from '@sveltejs/kit';

export async function GET() {
  return logout();
}

export async function POST() {
  return logout();
}

function logout() {
  const headers = new Headers();
  headers.append('Set-Cookie', `session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  headers.append('Location', '/login');

  return new Response(null, {
    status: 302,
    headers
  });
}