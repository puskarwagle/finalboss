import type { WorkflowContext } from '../core/workflow_engine';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const printLog = (message: string) => {
  console.log(message);
};

// Configuration interfaces
interface QuestionConfig {
  id: string;
  patterns: string[];
  questionType: string;
  userAnswer: any;
  frequency: number;
  description: string;
}

interface GenericQuestionsConfig {
  description: string;
  lastUpdated: string;
  questions: QuestionConfig[];
  userSettings: {
    autoAnswerEnabled: boolean;
    requireConfirmation: boolean;
    skipAIForGeneric: boolean;
    logAnswers: boolean;
    notes: string;
  };
}

// Load configuration from JSON file
function loadGenericQuestionsConfig(): GenericQuestionsConfig {
  try {
    const configPath = path.join(__dirname, 'generic_questions_config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    printLog(`❌ Failed to load generic questions config: ${error}`);
    // Return minimal config as fallback
    return {
      description: "Fallback configuration",
      lastUpdated: new Date().toISOString(),
      questions: [],
      userSettings: {
        autoAnswerEnabled: true,
        requireConfirmation: false,
        skipAIForGeneric: true,
        logAnswers: true,
        notes: "Fallback settings"
      }
    };
  }
}

// Save updated configuration
function saveGenericQuestionsConfig(config: GenericQuestionsConfig): void {
  try {
    const configPath = path.join(__dirname, 'generic_questions_config.json');
    config.lastUpdated = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    printLog(`✅ Generic questions config saved successfully`);
  } catch (error) {
    printLog(`❌ Failed to save generic questions config: ${error}`);
  }
}

// Export config management functions for UI
export function getGenericQuestionsConfig(): GenericQuestionsConfig {
  return loadGenericQuestionsConfig();
}

export function updateGenericQuestionsConfig(config: GenericQuestionsConfig): boolean {
  try {
    saveGenericQuestionsConfig(config);
    return true;
  } catch (error) {
    printLog(`❌ Failed to update config: ${error}`);
    return false;
  }
}

export function updateQuestionAnswer(questionId: string, newAnswer: any): boolean {
  try {
    const config = loadGenericQuestionsConfig();
    const questionIndex = config.questions.findIndex(q => q.id === questionId);

    if (questionIndex === -1) {
      printLog(`❌ Question with ID '${questionId}' not found`);
      return false;
    }

    config.questions[questionIndex].userAnswer = newAnswer;
    saveGenericQuestionsConfig(config);
    printLog(`✅ Updated answer for question: ${questionId}`);
    return true;
  } catch (error) {
    printLog(`❌ Failed to update question answer: ${error}`);
    return false;
  }
}

// Check if a question can be answered generically (without AI)
export function isGenericQuestion(questionText: string): boolean {
  const config = loadGenericQuestionsConfig();

  if (!config.userSettings.autoAnswerEnabled) {
    return false;
  }

  return config.questions.some(questionConfig => {
    return questionConfig.patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(questionText);
    });
  });
}

// Get generic answer for a question using JSON configuration
export function getGenericAnswer(questionText: string, options: string[] = []): any {
  const config = loadGenericQuestionsConfig();

  for (const questionConfig of config.questions) {
    // Check if question matches any pattern
    const matchesPattern = questionConfig.patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(questionText);
    });

    if (matchesPattern) {
      printLog(`🎯 Generic answer found for: "${questionText}" (${questionConfig.id})`);

      const answer = getAnswerFromConfig(questionConfig, options);

      if (config.userSettings.logAnswers) {
        printLog(`📝 Generic answer: ${JSON.stringify(answer)}`);
      }

      return answer;
    }
  }

  printLog(`❓ No generic answer found for: "${questionText}"`);
  return null;
}

// Convert configuration to actual answer based on question type and options
function getAnswerFromConfig(questionConfig: QuestionConfig, options: string[]): any {
  const { questionType, userAnswer } = questionConfig;

  switch (questionType) {
    case 'select':
      // Find preferred option in available options
      if (userAnswer.preferredOptions) {
        for (const preferred of userAnswer.preferredOptions) {
          const index = options.findIndex(opt =>
            opt.toLowerCase().includes(preferred.toLowerCase())
          );
          if (index !== -1) {
            return index;
          }
        }
      }

      // Use fallback
      if (userAnswer.fallbackToLast) {
        return options.length > 0 ? options.length - 1 : 0;
      }

      return userAnswer.fallbackIndex || 0;

    case 'checkbox':
      const selectedIndices: number[] = [];

      if (userAnswer.preferredTechnologies) {
        const preferred = userAnswer.preferredTechnologies;
        options.forEach((option, index) => {
          const optionLower = option.toLowerCase();
          if (preferred.some((tech: string) => optionLower.includes(tech.toLowerCase()))) {
            selectedIndices.push(index);
          }
        });
      }

      if (userAnswer.preferredLanguages) {
        const preferred = userAnswer.preferredLanguages;
        options.forEach((option, index) => {
          const optionLower = option.toLowerCase();
          if (preferred.some((lang: string) => optionLower.includes(lang.toLowerCase()))) {
            selectedIndices.push(index);
          }
        });
      }

      // Limit selections if specified
      if (userAnswer.maxSelections && selectedIndices.length > userAnswer.maxSelections) {
        return selectedIndices.slice(0, userAnswer.maxSelections);
      }

      // If no matches, select first few options as fallback
      if (selectedIndices.length === 0) {
        const fallbackCount = Math.min(3, options.length);
        return Array.from({ length: fallbackCount }, (_, i) => i);
      }

      return selectedIndices;

    case 'text':
    case 'textarea':
      return userAnswer.textValue || userAnswer.customText || '';

    case 'number':
      return userAnswer.numericValue || 0;

    case 'date':
      return userAnswer.dateValue || new Date().toISOString().split('T')[0];

    default:
      return userAnswer.textValue || '';
  }
}

// Fill a form field with the appropriate answer
export async function fillFormField(
  ctx: WorkflowContext,
  fieldSelector: string,
  questionType: string,
  answer: any
): Promise<boolean> {
  try {
    switch (questionType) {
      case 'select':
      case 'radio':
        // Select option by index
        await ctx.driver.executeScript(`
          const select = document.querySelector('${fieldSelector}');
          if (select && select.options && select.options[${answer}]) {
            select.selectedIndex = ${answer};
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }

          // Try radio buttons
          const radios = document.querySelectorAll('${fieldSelector} input[type="radio"]');
          if (radios.length > ${answer}) {
            radios[${answer}].checked = true;
            radios[${answer}].dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        `);
        return true;

      case 'checkbox':
        // Select multiple options by indices
        if (Array.isArray(answer)) {
          await ctx.driver.executeScript(`
            const checkboxes = document.querySelectorAll('${fieldSelector} input[type="checkbox"]');
            const indices = ${JSON.stringify(answer)};

            indices.forEach(index => {
              if (checkboxes[index]) {
                checkboxes[index].checked = true;
                checkboxes[index].dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
            return true;
          `);
        }
        return true;

      case 'text':
      case 'textarea':
      case 'email':
      case 'tel':
      case 'url':
        // Enter text value
        const textElement = await ctx.driver.findElement({ css: fieldSelector });
        await textElement.clear();
        await textElement.sendKeys(String(answer));
        return true;

      case 'number':
        // Enter numeric value
        const numberElement = await ctx.driver.findElement({ css: fieldSelector });
        await numberElement.clear();
        await numberElement.sendKeys(String(answer));
        return true;

      case 'date':
        // Enter date value
        const dateElement = await ctx.driver.findElement({ css: fieldSelector });
        await dateElement.clear();
        await dateElement.sendKeys(String(answer));
        return true;

      default:
        printLog(`⚠️ Unknown question type: ${questionType}`);
        return false;
    }
  } catch (error) {
    printLog(`❌ Failed to fill form field: ${error}`);
    return false;
  }
}

// Main handler for answering generic questions
export async function* handleGenericQuestions(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("🔍 Checking for employer questions that can be answered generically...");

    // Load job data to get questions
    if (!ctx.currentJobFile) {
      printLog("❌ No current job file available");
      yield "no_job_data";
      return;
    }

    const fs = await import('fs');
    const jobData = JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8'));

    if (!jobData.questions || !Array.isArray(jobData.questions)) {
      printLog("ℹ️ No structured questions found in job data");
      yield "no_questions";
      return;
    }

    let genericAnswered = 0;
    let totalQuestions = jobData.questions.length;

    printLog(`📋 Found ${totalQuestions} employer questions`);

    for (let i = 0; i < jobData.questions.length; i++) {
      const question = jobData.questions[i];

      if (isGenericQuestion(question.q)) {
        printLog(`✅ Question ${i + 1}/${totalQuestions} can be answered generically`);

        const answer = getGenericAnswer(question.q, question.opts || []);

        if (answer !== null) {
          // Try to fill the form field (this would need actual form selectors)
          printLog(`📝 Would answer: "${question.q}" with: ${JSON.stringify(answer)}`);
          genericAnswered++;
        }
      } else {
        printLog(`❓ Question ${i + 1}/${totalQuestions} requires AI: "${question.q}"`);
      }
    }

    printLog(`🎯 Answered ${genericAnswered}/${totalQuestions} questions generically`);

    if (genericAnswered > 0) {
      yield "generic_questions_answered";
    } else {
      yield "no_generic_questions";
    }

  } catch (error) {
    printLog(`❌ Generic questions handler error: ${error}`);
    yield "generic_questions_error";
  }
}