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

    const questionsData = await ctx.driver.executeScript(`
      let questions = [];

      // Strategy 1: Look for strong tags that contain questions
      const strongTags = document.querySelectorAll('strong');

      strongTags.forEach((strong, index) => {
        const questionText = strong.textContent.trim();
        if (!questionText) return;

        // Find the closest parent container that might contain the input
        let container = strong.closest('div, fieldset, section, label');
        if (!container) {
          // Go up a few levels to find the container
          container = strong.parentElement?.parentElement?.parentElement;
        }

        if (!container) return;

        // Look for select dropdowns in the container or nearby
        const selects = container.querySelectorAll('select');
        selects.forEach(select => {
          const options = Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.textContent.trim(),
            selected: opt.selected
          }));

          questions.push({
            type: 'select',
            question: questionText,
            element: select.id || select.name || \`select_\${index}\`,
            options: options,
            required: select.required,
            currentValue: select.value
          });
        });

        // Look for radio button groups - check the fieldset or parent div
        let radioContainer = container;
        if (container.tagName === 'FIELDSET') {
          radioContainer = container;
        } else {
          // Find the fieldset that might contain this question
          radioContainer = container.closest('fieldset') || container;
        }

        const radios = radioContainer.querySelectorAll('input[type="radio"]');
        if (radios.length > 0) {
          // Group radios by name
          const radioGroups = {};
          radios.forEach(radio => {
            const name = radio.name;
            if (!radioGroups[name]) {
              radioGroups[name] = [];
            }

            // Find the label text for this radio
            let labelText = '';
            const label = radioContainer.querySelector(\`label[for="\${radio.id}"]\`);
            if (label) {
              labelText = label.textContent.trim();
            } else {
              // Try to find text near the radio
              const parent = radio.closest('div');
              if (parent) {
                const spans = parent.querySelectorAll('span');
                labelText = spans[spans.length - 1]?.textContent?.trim() || radio.value;
              }
            }

            radioGroups[name].push({
              value: radio.value,
              text: labelText,
              checked: radio.checked,
              id: radio.id
            });
          });

          // Add each radio group as a question (but avoid duplicates)
          Object.entries(radioGroups).forEach(([name, options]) => {
            // Check if we already have this radio group
            const alreadyExists = questions.some(q => q.type === 'radio' && q.element === name);
            if (!alreadyExists) {
              questions.push({
                type: 'radio',
                question: questionText,
                element: name,
                options: options,
                required: radios[0].required
              });
            }
          });
        }
      });

      // Strategy 2: Look for labels with question-like text
      const labels = document.querySelectorAll('label');

      labels.forEach((label, index) => {
        const labelText = label.textContent.trim();
        if (!labelText || labelText.length < 5) return;

        // Look for question patterns
        if (labelText.includes('?') || labelText.toLowerCase().includes('experience') ||
            labelText.toLowerCase().includes('qualification') || labelText.toLowerCase().includes('skill')) {

          // Find associated input elements
          const forAttr = label.getAttribute('for');
          let inputElement = null;

          if (forAttr) {
            inputElement = document.getElementById(forAttr);
          } else {
            // Look for inputs within the label or nearby
            inputElement = label.querySelector('input, select, textarea') ||
                          label.parentElement?.querySelector('input, select, textarea');
          }

          if (inputElement) {
            if (inputElement.type === 'radio') {
              // Handle radio group
              const radioName = inputElement.name;
              const allRadios = document.querySelectorAll(\`input[name="\${radioName}"]\`);

              const radioOptions = Array.from(allRadios).map(radio => ({
                value: radio.value,
                text: radio.parentElement?.textContent?.trim() || radio.value,
                checked: radio.checked,
                id: radio.id
              }));

              questions.push({
                type: 'radio',
                question: labelText,
                element: radioName,
                options: radioOptions,
                required: inputElement.required
              });
            } else if (inputElement.tagName === 'SELECT') {
              // Handle select dropdown
              const options = Array.from(inputElement.options).map(opt => ({
                value: opt.value,
                text: opt.textContent.trim(),
                selected: opt.selected
              }));

              questions.push({
                type: 'select',
                question: labelText,
                element: inputElement.id || inputElement.name || \`select_label_\${index}\`,
                options: options,
                required: inputElement.required,
                currentValue: inputElement.value
              });
            }
          }
        }
      });

      // Remove duplicates based on element identifier
      const uniqueQuestions = [];
      const seenElements = new Set();

      questions.forEach(q => {
        if (!seenElements.has(q.element)) {
          seenElements.add(q.element);
          uniqueQuestions.push(q);
        }
      });

      return {
        questionsFound: uniqueQuestions.length,
        questions: uniqueQuestions,
        pageUrl: window.location.href,
        scrapedAt: new Date().toISOString()
      };
    `);

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

      // Add questions data to job file
      const updatedJobData = {
        ...existingJobData,
        employerQuestions: questionsData,
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