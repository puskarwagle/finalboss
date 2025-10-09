import {
  handleGetGenericQuestions,
  handleUpdateSettings,
  handleAddQuestion
} from '../../../bots/seek/unused/generic_questions_api.js';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
  const response = handleGetGenericQuestions();

  return new Response(JSON.stringify(response), {
    status: response.success ? 200 : 500,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const response = handleAddQuestion(body);

    return new Response(JSON.stringify(response), {
      status: response.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Server error: ${error.message}`,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request }) {
  try {
    const body = await request.json();

    if (body.type === 'settings') {
      const response = handleUpdateSettings(body.settings);

      return new Response(JSON.stringify(response), {
        status: response.success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request type',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Server error: ${error.message}`,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}