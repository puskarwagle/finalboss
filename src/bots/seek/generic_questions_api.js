/**
 * API helpers for managing generic questions configuration
 * This can be used by a web UI to allow users to configure their answers
 */

import {
  getGenericQuestionsConfig,
  updateGenericQuestionsConfig,
  updateQuestionAnswer
} from './generic_question_handler';

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {any} [data]
 * @property {string} [error]
 * @property {string} timestamp
 */

/**
 * Get all generic questions and their current answers
 * GET /api/generic-questions
 * @returns {ApiResponse}
 */
export function handleGetGenericQuestions() {
  try {
    const config = getGenericQuestionsConfig();

    return {
      success: true,
      data: {
        questions: config.questions.map(q => ({
          id: q.id,
          description: `Question ${q.id}`, // Simple description since it's not in the config
          patterns: q.match_keywords,
          questionType: 'text', // Default type since it's not in the config
          frequency: 1, // Default frequency since it's not in the config
          currentAnswer: {
            textValue: q.answer[0] || '',
            notes: ''
          },
          notes: ''
        })),
        settings: config.settings,
        lastUpdated: config.lastUpdated
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get generic questions: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update a specific question's answer
 * PUT /api/generic-questions/:questionId
 * @param {string} questionId
 * @param {any} newAnswer
 * @returns {ApiResponse}
 */
export function handleUpdateQuestionAnswer(questionId, newAnswer) {
  try {
    const success = updateQuestionAnswer(questionId, newAnswer);

    if (success) {
      return {
        success: true,
        data: { questionId, updatedAnswer: newAnswer },
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: `Question with ID '${questionId}' not found`,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to update question answer: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Update global settings for generic questions
 * PUT /api/generic-questions/settings
 * @param {any} newSettings
 * @returns {ApiResponse}
 */
export function handleUpdateSettings(newSettings) {
  try {
    const config = getGenericQuestionsConfig();
    config.settings = { ...config.settings, ...newSettings };

    const success = updateGenericQuestionsConfig(config);

    if (success) {
      return {
        success: true,
        data: { settings: config.settings },
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: 'Failed to update settings',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to update settings: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get statistics about generic question usage
 * GET /api/generic-questions/stats
 * @returns {ApiResponse}
 */
export function handleGetStats() {
  try {
    const config = getGenericQuestionsConfig();

    const stats = {
      totalQuestions: config.questions.length,
      enabledQuestions: config.questions.length, // All are enabled by patterns
      autoAnswerEnabled: config.settings.autoAnswer,
      mostFrequentQuestion: config.questions.length > 0 ? {
        ...config.questions[0],
        description: `Question ${config.questions[0].id}`,
        frequency: 1
      } : null,
      questionTypes: config.questions.reduce((acc, q) => {
        acc.text = (acc.text || 0) + 1; // Default to text type
        return acc;
      }, { text: 0 }),
      totalFrequency: config.questions.length // Since we don't have actual frequency data
    };

    return {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get stats: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

// Example usage for SvelteKit or Express routes:
/*
// SvelteKit route: src/routes/api/generic-questions/+server.ts
export async function GET() {
  const response = handleGetGenericQuestions();
  return new Response(JSON.stringify(response), {
    status: response.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Express route:
app.get('/api/generic-questions', (req, res) => {
  const response = handleGetGenericQuestions();
  res.status(response.success ? 200 : 500).json(response);
});
*/