import type { WorkflowContext } from '../core/workflow_engine';
import { isGenericQuestion, getGenericAnswer } from './generic_question_handler';
import { API_URLS } from '../../lib/api-config.js';
import * as fs from 'fs';

/**
 * Unified intelligent question answering function
 * Used by both main flow and test flow
 *
 * Flow:
 * 1. Check if question matches generic questions config → use generic answer
 * 2. If no match → send to AI via employer questions API → use AI answer
 * 3. Fallback to default answers if all else fails
 */
export async function getIntelligentAnswers(questions: any[], ctx: WorkflowContext): Promise<any[]> {
  const answeredQuestions = [];

  for (const question of questions) {
    let answerSource = 'unknown';
    let selectedAnswer = null;
    let textAnswer = null;

    // Step 1: Check if it's a generic question first
    let hasGenericAnswer = false;
    if (isGenericQuestion(question.question)) {
      const genericAnswer = getGenericAnswer(question.question, question.type, question.options || []);
      if (genericAnswer !== null) {
        answerSource = 'Generic Config';
        hasGenericAnswer = true;
        if (question.type === 'select') {
          selectedAnswer = genericAnswer;
        } else if (question.type === 'checkbox') {
          // For checkbox, genericAnswer should be array of indices, convert to answer array
          if (Array.isArray(genericAnswer)) {
            const checkboxAnswers = genericAnswer.map(index => question.options[index]).filter(Boolean);
            selectedAnswer = checkboxAnswers;
          }
        } else if (question.type === 'text') {
          textAnswer = genericAnswer;
        }
      }
    }

    // Step 2: Always call AI API in test mode, or if no generic answer found
    if (selectedAnswer === null && textAnswer === null) {
      try {
        console.log(`🔍 AI API - Attempting to get answer for: "${question.question.substring(0, 50)}..."`);

        // Get job details from context
        const jobDetails = ctx.currentJobFile ?
          JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8')) :
          { title: 'Unknown Job', company: 'Unknown Company', details: 'No job details available' };

        const requestPayload = {
          questions: [{
            q: question.question,
            opts: question.options || []
          }],
          userEmail: 'dynamic@session.email', // Will be replaced by session
          jobDetails: {
            title: jobDetails.title || 'Java Developer',
            company: jobDetails.company || 'Tech Company',
            description: jobDetails.details || jobDetails.description || 'Software development role'
          }
        };

        console.log(`🔍 AI API - Request URL: ${API_URLS.QUESTION_ANSWERS()}`);
        console.log(`🔍 AI API - Request payload:`, JSON.stringify(requestPayload, null, 2));

        // Save request to JSON file for test debugging (only in test mode)
        const isTestMode = (globalThis as any).API_TEST_MODE;
        if (isTestMode) {
          fs.writeFileSync('apitestjsons/api_request.json', JSON.stringify({
            url: API_URLS.QUESTION_ANSWERS(),
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: requestPayload,
            timestamp: new Date().toISOString()
          }, null, 2));
        }

        // Call the Q&A API with job details and question
        const qnaResponse = await fetch(API_URLS.QUESTION_ANSWERS(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer rag_15817ebd3daef06781d8baaa243ccbaa_898ee85644b365e0a0ccd65bd6756af58313219f841a29b2a7b9ac9ad20d7fb7'
          },
          body: JSON.stringify(requestPayload)
        });

        console.log(`🔍 AI API - Response status: ${qnaResponse.status} ${qnaResponse.statusText}`);

        let responseData;
        if (qnaResponse.ok) {
          responseData = await qnaResponse.json();
          console.log(`🔍 AI API - Response data:`, JSON.stringify(responseData, null, 2));
        } else {
          responseData = await qnaResponse.text();
          console.log(`🔍 AI API - Error response: ${responseData}`);
        }

        // Save response to JSON file for test debugging (only in test mode)
        if (isTestMode) {
          fs.writeFileSync('apitestjsons/api_response.json', JSON.stringify({
            status: qnaResponse.status,
            statusText: qnaResponse.statusText,
            ok: qnaResponse.ok,
            data: responseData,
            timestamp: new Date().toISOString()
          }, null, 2));
        }

        if (qnaResponse.ok) {
          const qnaData = responseData;

          if (qnaData.success && qnaData.data && qnaData.data.answers) {
            answerSource = 'AI API';
            // Parse AI response to extract answer
            const aiAnswer = qnaData.data.answers;
            console.log(`🔍 AI API - Extracted answer: "${aiAnswer}"`);

            if (question.type === 'select' || question.type === 'checkbox') {
              // Extract index from AI response (assumes format like "Recommended Answer: option_text → Index: 3")
              const indexMatch = aiAnswer.match(/Index:\s*(\d+)|Answer:\s*(\d+)/i);
              selectedAnswer = indexMatch ? parseInt(indexMatch[1] || indexMatch[2]) : 0;
              console.log(`🔍 AI API - Parsed select answer: ${selectedAnswer}`);
            } else if (question.type === 'text') {
              // Extract text from AI response
              const textMatch = aiAnswer.match(/Answer:\s*"([^"]+)"/i) || aiAnswer.match(/Answer:\s*([^\n]+)/i);
              textAnswer = textMatch ? textMatch[1].trim() : aiAnswer.substring(0, 100);
              console.log(`🔍 AI API - Parsed text answer: "${textAnswer}"`);
            }
          } else {
            console.log(`🔍 AI API - Invalid response structure or not successful`);
          }
        } else {
          console.log(`🔍 AI API - Error response (non-200 status)`);
        }
      } catch (error) {
        console.log(`🔍 AI API - Exception occurred: ${error.message}`);
        console.log(`   ⚠️ AI API failed for question: ${question.question.substring(0, 30)}...`);
      }
    }

    // Step 3: If no answer found, leave it unanswered
    if (selectedAnswer === null && textAnswer === null) {
      answerSource = 'No Answer';
      console.log(`   ❌ No answer available for: ${question.question.substring(0, 50)}...`);
    }

    answeredQuestions.push({
      ...question,
      answerSource,
      selectedAnswer,
      textAnswer
    });
  }

  return answeredQuestions;
}

/**
 * Extract questions from current page using the browser script
 */
export async function extractQuestionsFromPage(ctx: WorkflowContext): Promise<any[]> {
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  // Get current file directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Use the same extraction logic as the test
  const scriptPath = path.join(__dirname, 'browser_question_extractor.js');
  const browserScript = fs.readFileSync(scriptPath, 'utf8');
  const extractedData: any = await ctx.driver.executeScript(browserScript);

  if (!extractedData || extractedData.questionsFound === 0) {
    return [];
  }

  return extractedData.questions;
}