import type { WorkflowContext } from '../core/workflow_engine';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const printLog = (message: string) => {
  console.log(message);
};

// Handle Employer Questions - Detect and Save Questions
export async function* handleEmployerQuestions(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Scanning for employer questions...");

    // Read the browser script from the external file
    const scriptPath = path.join(__dirname, 'browser_question_extractor.js');
    const browserScript = fs.readFileSync(scriptPath, 'utf8');

    const questionsData = await ctx.driver.executeScript(browserScript);

    if (questionsData && questionsData.questionsFound > 0) {
      printLog(`Found ${questionsData.questionsFound} employer questions`);

      // Load existing job data if available
      let existingJobData = {};
      if (ctx.currentJobFile) {
        try {
          const existingData = fs.readFileSync(ctx.currentJobFile, 'utf8');
          existingJobData = JSON.parse(existingData);
        } catch (error) {
          printLog(`Could not load existing job data: ${error}`);
        }
      }

      // Helper to build per-type instructions
      const instructionByType: Record<string, { instruction: string; expected: string }> = {
        select: {
          instruction: 'Choose the best single option index for this select question based on the resume.',
          expected: 'Return a single number representing the selected option index (0-based).'
        },
        radio: {
          instruction: 'Choose the best single option index for this radio group based on the resume.',
          expected: 'Return a single number representing the selected option index (0-based).'
        },
        checkbox: {
          instruction: 'Select all applicable option indices for this checkbox group based on the resume.',
          expected: 'Return an array of numbers representing the selected option indices (0-based).'
        },
        textarea: {
          instruction: 'Write a concise, professional sentence or two that answers this prompt.',
          expected: 'Return a string (max 2 sentences).'
        },
        text: {
          instruction: 'Provide a concise text answer based on the resume.',
          expected: 'Return a string.'
        },
        number: {
          instruction: 'Provide a numeric answer (e.g., expected salary, years of experience).',
          expected: 'Return a number (no commas).'
        },
        date: {
          instruction: 'Provide a realistic date consistent with the resume and context.',
          expected: "Return a date string in 'YYYY-MM-DD' format."
        },
        email: {
          instruction: 'Provide the candidate professional email address if requested.',
          expected: 'Return a valid email string.'
        },
        tel: {
          instruction: 'Provide the candidate phone number in international or local format.',
          expected: 'Return a phone number string.'
        },
        url: {
          instruction: 'Provide a relevant URL (e.g., portfolio, LinkedIn) if requested.',
          expected: 'Return a URL string.'
        }
      };

      // Create AI format: merge automation fields into questions and attach per-type instructions
      const aiFormat = {
        instruction: "Answer each question in order according to its type. For select/radio: return the chosen option index (number). For checkbox: return an array of option indices. For text/textarea: return a string. For number: return a number. For date: return 'YYYY-MM-DD'.",
        questions: questionsData.questions.map((q: any, index: number) => {
          const hasOptions = Array.isArray(q.options);
          const optsTexts = hasOptions
            ? (q.options as any[])
                .filter((opt: any) => ((opt.value ?? '') !== '' || (opt.text ?? '') !== ''))
                .map((opt: any) => (opt.text ?? '').trim())
            : [];
          const meta = instructionByType[q.type] || instructionByType['text'];
          return {
            id: index,
            q: q.question,
            type: q.type,
            opts: optsTexts,
            instruction: meta.instruction,
            expectedResponse: meta.expected
          };
        })
      };

      // Save only the clean AI format
      const updatedJobData = {
        ...existingJobData,
        ...aiFormat,
        lastUpdated: new Date().toISOString()
      };

      // Save to the same job file if it exists, otherwise create new one
      if (ctx.currentJobFile) {
        fs.writeFileSync(ctx.currentJobFile, JSON.stringify(updatedJobData, null, 2));
        printLog(`Updated job file with ${questionsData.questionsFound} employer questions: ${ctx.currentJobFile}`);
      } else {
        // Fallback: create new file in jobs directory
        const jobsDir = path.join(__dirname, '..', 'jobs');
        if (!fs.existsSync(jobsDir)) {
          fs.mkdirSync(jobsDir, { recursive: true });
        }

        const timestamp = Date.now().toString();
        const filename = `employer_questions_${timestamp}.json`;
        const filepath = path.join(jobsDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(updatedJobData, null, 2));
        printLog(`Saved employer questions to new file: ${filename}`);
      }

      yield "employer_questions_saved";
    } else {
      printLog("No employer questions found on this page");
      yield "no_employer_questions";
    }

  } catch (error) {
    printLog(`Employer questions handling error: ${error}`);
    yield "employer_questions_error";
  }
}