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
          description: q.description,
          patterns: q.patterns,
          questionType: q.questionType,
          frequency: q.frequency,
          currentAnswer: q.userAnswer,
          notes: q.userAnswer.notes || ''
        })),
        settings: config.userSettings,
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
    config.userSettings = { ...config.userSettings, ...newSettings };

    const success = updateGenericQuestionsConfig(config);

    if (success) {
      return {
        success: true,
        data: { settings: config.userSettings },
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
      autoAnswerEnabled: config.userSettings.autoAnswerEnabled,
      mostFrequentQuestion: config.questions.reduce((max, q) =>
        q.frequency > max.frequency ? q : max,
        config.questions[0]
      ),
      questionTypes: config.questions.reduce((acc, q) => {
        acc[q.questionType] = (acc[q.questionType] || 0) + 1;
        return acc;
      }, {}),
      totalFrequency: config.questions.reduce((sum, q) => sum + q.frequency, 0)
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