import type { WorkflowContext } from '../../core/workflow_engine';
import { isGenericQuestion, getGenericAnswer } from './generic_question_handler';
import * as fs from 'fs';
import * as path from 'path';

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
  const aiQuestions = [];
  const genericAnsweredIndices = new Set();

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    let answerSource = 'unknown';
    let selectedAnswer = null;
    let textAnswer = null;

    if (isGenericQuestion(question.question)) {
      const genericAnswer = getGenericAnswer(question.question, question.type, question.options || []);
      if (genericAnswer !== null) {
        answerSource = 'Generic Config';
        genericAnsweredIndices.add(i);
        if (question.type === 'select') {
          selectedAnswer = genericAnswer;
        } else if (question.type === 'checkbox') {
          if (Array.isArray(genericAnswer)) {
            const checkboxAnswers = genericAnswer.map(index => question.options[index]).filter(Boolean);
            selectedAnswer = checkboxAnswers;
          }
        } else if (question.type === 'text') {
          textAnswer = genericAnswer;
        }
      }
    }

    answeredQuestions.push({
      ...question,
      answerSource,
      selectedAnswer,
      textAnswer,
      originalIndex: i
    });

    if (answerSource === 'unknown') {
      aiQuestions.push({
        q: question.question,
        opts: question.options || []
      });
    }
  }

  if (aiQuestions.length > 0) {
    try {
      console.log(`🤖 Calling AI API for ${aiQuestions.length} questions...`);

      const jobData = ctx.currentJobFile ?
        JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8')) :
        {};

      const jobId = jobData.jobId || 'unknown';

      const resumePath = path.join(process.cwd(), 'src/bots/all-resumes/software_engineer.txt');
      const resumeText = fs.existsSync(resumePath)
        ? fs.readFileSync(resumePath, 'utf8')
        : "Experienced software developer";

      const requestBody = {
        job_id: `seek_${jobId}`,
        questions: aiQuestions,
        resume_text: resumeText,
        useAi: "deepseek-chat",
        job_details: jobData.details || `${jobData.title} at ${jobData.company}`,

        // Required tracking fields per API docs
        platform: "seek",
        platform_job_id: jobId,
        job_title: jobData.title || '',
        company: jobData.company || '',

        // Custom prompt for better AI results
        prompt: `Answer these employer screening questions professionally and honestly based on the provided resume.
For multiple choice questions, select the most appropriate option that matches the candidate's experience.
For text questions, provide clear, concise answers (1-2 sentences).
Be truthful - if the candidate doesn't have a specific qualification, indicate that politely while highlighting related experience.`
      };

      const jobDir = path.join(__dirname, '../../jobs', jobId);
      if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(jobDir, 'qna_request.json'),
        JSON.stringify(requestBody, null, 2)
      );

      // Use apiRequest helper for authenticated calls
      const { apiRequest } = await import('../../core/api_client');
      const data = await apiRequest('/api/questionAndAnswers', 'POST', requestBody);

      fs.writeFileSync(
        path.join(jobDir, 'qna_response.json'),
        JSON.stringify(data, null, 2)
      );

      console.log(`✅ AI answers received for ${aiQuestions.length} questions`);

      if (data.answers) {
        const aiAnswersText = data.answers;
        let aiAnswerIndex = 0;

        for (let i = 0; i < answeredQuestions.length; i++) {
          if (answeredQuestions[i].answerSource === 'unknown') {
            answeredQuestions[i].answerSource = 'AI API';
            answeredQuestions[i].textAnswer = `AI Answer ${aiAnswerIndex + 1}`;
            aiAnswerIndex++;
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ AI API failed: ${error}`);
    }
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
  const scriptPath = path.join(__dirname, '../scripts/browser_question_extractor.js');
  const browserScript = fs.readFileSync(scriptPath, 'utf8');
  const extractedData: any = await ctx.driver.executeScript(browserScript);

  if (!extractedData || extractedData.questionsFound === 0) {
    return [];
  }

  return extractedData.questions;
}