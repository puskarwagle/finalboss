// Browser-side JavaScript for extracting employer questions from job application pages
// This script runs inside the browser context via Selenium's executeScript

function extractEmployerQuestions() {
  var questions = [];

  // Helper function to generate a unique selector for an element
  function getUniqueSelector(el) {
    if (!el) return '';
    let selector = '';
    const automationId = el.getAttribute('data-automation');
    if (automationId) {
      selector = `[data-automation="${automationId}"]`;
      if (document.querySelectorAll(selector).length === 1) return selector;
    }
    const testId = el.getAttribute('data-testid');
    if (testId) {
      selector = `[data-testid="${testId}"]`;
      if (document.querySelectorAll(selector).length === 1) return selector;
    }
    if (el.id) {
      selector = '#' + el.id;
      if (document.querySelectorAll(selector).length === 1) return selector;
    }
    return ''; // Return empty if no good unique selector is found
  }

  // Strategy 1: Look for strong tags that contain questions
  document.querySelectorAll('strong').forEach(function(strong) {
    var questionText = strong.textContent.trim();
    if (!questionText || !questionText.includes('?')) return;

    var container = strong.closest('div, fieldset, section');
    if (!container) return;

    var containerSelector = getUniqueSelector(container);

    // Find selects, radios, checkboxes etc. within this container
    var select = container.querySelector('select');
    if (select) {
      var options = Array.from(select.options).map(opt => ({ text: opt.textContent.trim() }));
      questions.push({
        type: 'select',
        question: questionText,
        options: options,
        containerSelector: containerSelector
      });
    }
  });

  // Strategy 2: Look for labels associated with inputs
  document.querySelectorAll('label').forEach(function(label) {
    var questionText = label.textContent.trim();
    if (!questionText) return;

    var inputElement = document.getElementById(label.getAttribute('for')) || label.querySelector('input, select, textarea');
    if (!inputElement) return;
    
    var container = label.closest('div, fieldset, section');
    if (!container) return;

    var containerSelector = getUniqueSelector(container);

    if (inputElement.tagName === 'SELECT') {
      var options = Array.from(inputElement.options).map(opt => ({ text: opt.textContent.trim() }));
      questions.push({
        type: 'select',
        question: questionText,
        options: options,
        containerSelector: containerSelector
      });
    }
  });

  // Remove duplicates
  var uniqueQuestions = [];
  var seen = new Set();
  questions.forEach(function(q) {
    var key = q.question + (q.containerSelector || '');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueQuestions.push(q);
    }
  });

  return {
    questionsFound: uniqueQuestions.length,
    questions: uniqueQuestions,
  };
}

return extractEmployerQuestions();
