import { handleGetStats } from '../../../../bots/seek/generic_questions_api.js';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
  const response = handleGetStats();

  return new Response(JSON.stringify(response), {
    status: response.success ? 200 : 500,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}