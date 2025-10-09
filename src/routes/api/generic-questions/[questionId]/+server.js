import {
  handleUpdateQuestionAnswer,
  handleDeleteQuestion
} from '../../../../bots/seek/handlers/generic_questions_api.js';

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request }) {
  try {
    const { questionId } = params;
    const body = await request.json();

    const response = handleUpdateQuestionAnswer(questionId, body);

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
export async function DELETE({ params }) {
  try {
    const { questionId } = params;

    const response = handleDeleteQuestion(questionId);

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