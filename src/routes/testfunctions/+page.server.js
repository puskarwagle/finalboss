import { requireAuth } from '$lib/route-guard.js';

export async function load({ parent }) {
  const { session } = await parent();
  requireAuth(session);

  return {};
}