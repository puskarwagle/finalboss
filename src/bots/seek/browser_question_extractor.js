// Browser-side JavaScript for extracting employer questions from job application pages
// This script runs inside the browser context via Selenium's executeScript

function extractEmployerQuestions() {
  var questions = [];
  var questionCounter = 0;

  // Strategy 1: Find all potential question containers and process them
  var containers = document.querySelectorAll('[data-automation*="question"], fieldset, .form-group, .form-field, .question-container');

  containers.forEach(function(container) {
    let questionText = '';
    const questionEl = container.querySelector('strong, legend, h3, label, .question-text');
    if (questionEl) {
      questionText = questionEl.textContent.trim();
    }

    if (!questionText || !questionText.includes('?')) return;

    // --- Assign a unique ID and use it as the selector ---
    const uniqueId = `gemini-q-container-${questionCounter++}`;
    container.id = uniqueId;
    const containerSelector = `#${uniqueId}`;

    // Determine question type and extract options
    const select = container.querySelector('select');
    const radioButtons = container.querySelectorAll('input[type="radio"]');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const textInput = container.querySelector('input[type="text"], textarea');

    if (select) {
      const options = Array.from(select.options).map(opt => opt.textContent.trim()).filter(opt => opt);
      questions.push({
        type: 'select',
        question: questionText,
        options: options,
        containerSelector: containerSelector
      });
    } else if (radioButtons.length > 0) {
      const options = Array.from(radioButtons).map(radio => {
        const label = container.querySelector(`label[for="${radio.id}"]`) ||
                     radio.closest('label') ||
                     radio.nextElementSibling;
        return label ? label.textContent.trim() : radio.value;
      }).filter(opt => opt);
      questions.push({
        type: 'radio',
        question: questionText,
        options: options,
        containerSelector: containerSelector
      });
    } else if (checkboxes.length > 0) {
      const options = Array.from(checkboxes).map(checkbox => {
        const label = container.querySelector(`label[for="${checkbox.id}"]`) ||
                     checkbox.closest('label') ||
                     checkbox.nextElementSibling;
        return label ? label.textContent.trim() : checkbox.value;
      }).filter(opt => opt);
      questions.push({
        type: 'checkbox',
        question: questionText,
        options: options,
        containerSelector: containerSelector
      });
    } else if (textInput) {
      questions.push({
        type: 'text',
        question: questionText,
        options: [],
        containerSelector: containerSelector
      });
    }
  });

  // Strategy 2: Fallback - look for standalone form fields if no containers found
  if (questions.length === 0) {
    const allSelects = document.querySelectorAll('select');
    const allRadioGroups = new Map();
    const allCheckboxGroups = new Map();
    const allTextInputs = document.querySelectorAll('input[type="text"], textarea');

    // Process selects
    allSelects.forEach(function(select) {
      const label = document.querySelector(`label[for="${select.id}"]`) ||
                   select.closest('label') ||
                   select.previousElementSibling;
      const questionText = label ? label.textContent.trim() : '';

      if (questionText && questionText.includes('?')) {
        const uniqueId = `gemini-q-standalone-${questionCounter++}`;

        // Try to find a parent container first, otherwise use the select itself
        const container = select.closest('fieldset') || select.closest('.form-group') || select.closest('div') || select;
        container.id = uniqueId;

        const options = Array.from(select.options).map(opt => opt.textContent.trim()).filter(opt => opt);
        questions.push({
          type: 'select',
          question: questionText,
          options: options,
          containerSelector: `#${uniqueId}`
        });
      }
    });

    // Process radio buttons (group by name)
    document.querySelectorAll('input[type="radio"]').forEach(function(radio) {
      if (!allRadioGroups.has(radio.name)) {
        const label = document.querySelector(`label[for="${radio.id}"]`) ||
                     radio.closest('label') ||
                     radio.closest('fieldset')?.querySelector('legend');
        const questionText = label ? label.textContent.trim() : '';

        if (questionText && questionText.includes('?')) {
          const groupRadios = document.querySelectorAll(`input[type="radio"][name="${radio.name}"]`);
          const options = Array.from(groupRadios).map(r => {
            const rLabel = document.querySelector(`label[for="${r.id}"]`) ||
                          r.closest('label') ||
                          r.nextElementSibling;
            return rLabel ? rLabel.textContent.trim() : r.value;
          }).filter(opt => opt);

          const uniqueId = `gemini-q-radio-${questionCounter++}`;
          radio.closest('fieldset')?.setAttribute('id', uniqueId) || radio.parentElement?.setAttribute('id', uniqueId);

          questions.push({
            type: 'radio',
            question: questionText,
            options: options,
            containerSelector: `#${uniqueId}`
          });
          allRadioGroups.set(radio.name, true);
        }
      }
    });

    // Process text inputs
    allTextInputs.forEach(function(input) {
      const label = document.querySelector(`label[for="${input.id}"]`) ||
                   input.closest('label') ||
                   input.previousElementSibling;
      const questionText = label ? label.textContent.trim() : '';

      if (questionText && questionText.includes('?')) {
        const uniqueId = `gemini-q-text-${questionCounter++}`;
        input.id = uniqueId;
        questions.push({
          type: 'text',
          question: questionText,
          options: [],
          containerSelector: `#${uniqueId}`
        });
      }
    });
  }

  // Remove duplicates based on question text
  var uniqueQuestions = [];
  var seen = new Set();
  questions.forEach(function(q) {
    if (!seen.has(q.question)) {
      seen.add(q.question);
      uniqueQuestions.push(q);
    }
  });

  return {
    questionsFound: uniqueQuestions.length,
    questions: uniqueQuestions,
  };
}

return extractEmployerQuestions();
