// Browser-side JavaScript for extracting employer questions from job application pages
// This script runs inside the browser context via Selenium's executeScript

function extractEmployerQuestions() {
  var questions = [];

  // Strategy 1: Look for strong tags that contain questions
  var strongTags = document.querySelectorAll('strong');

  strongTags.forEach(function(strong, index) {
    var questionText = strong.textContent.trim();
    if (!questionText) return;

    // Find the closest parent container that might contain the input
    var container = strong.closest('div, fieldset, section, label');
    if (!container) {
      // Go up a few levels to find the container (safe access without optional chaining)
      var p = strong.parentElement;
      if (p && p.parentElement) p = p.parentElement;
      if (p && p.parentElement) p = p.parentElement;
      container = p;
    }

    if (!container) return;

    // Look for select dropdowns in the container or nearby
    var selects = container.querySelectorAll('select');
    selects.forEach(function(select) {
      var options = Array.from(select.options).map(function(opt) { 
        return {
          value: opt.value || '',
          text: (opt.textContent || opt.innerText || '').trim(),
          selected: opt.selected,
          disabled: opt.disabled
        }; 
      });

      questions.push({
        type: 'select',
        question: questionText,
        element: select.id || select.name || ('select_' + index),
        options: options,
        required: select.required,
        currentValue: select.value || '',
        selectedIndex: select.selectedIndex
      });
    });

    // Look for radio button groups - check the fieldset or parent div
    var radioContainer = container;
    if (container.tagName === 'FIELDSET') {
      radioContainer = container;
    } else {
      // Find the fieldset that might contain this question
      radioContainer = container.closest('fieldset') || container;
    }

    var radios = radioContainer.querySelectorAll('input[type="radio"]');
    if (radios.length > 0) {
      // Group radios by name
      var radioGroups = {};
      radios.forEach(function(radio) {
        var name = radio.name;
        if (!radioGroups[name]) {
          radioGroups[name] = [];
        }

        // Find the label text for this radio
        var labelText = '';
        var label = radioContainer.querySelector('label[for="' + radio.id + '"]');
        if (label) {
          labelText = label.textContent.trim();
        } else {
          // Try to find text near the radio
          var parent = radio.closest('div');
          if (parent) {
            var spans = parent.querySelectorAll('span');
            var lastSpan = spans[spans.length - 1];
            labelText = (lastSpan && lastSpan.textContent ? lastSpan.textContent.trim() : '') || radio.value;
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
      Object.keys(radioGroups).forEach(function(name) {
        var options = radioGroups[name];
        // Check if we already have this radio group
        var alreadyExists = questions.some(function(q) { return q.type === 'radio' && q.element === name; });
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

    // Look for checkbox groups within the same container/fieldset
    (function() {
      // Strategy 1: Look for all checkboxes in a wider area around the strong tag
      var searchArea = container;
      
      // Expand search area - look in parent containers and siblings
      var parentContainer = container.parentElement;
      if (parentContainer) {
        var grandParent = parentContainer.parentElement;
        if (grandParent) {
          searchArea = grandParent; // Look in grandparent for checkbox groups
        } else {
          searchArea = parentContainer;
        }
      }
      
      // Native checkbox inputs
      var allCheckboxes = searchArea.querySelectorAll('input[type="checkbox"]');
      console.log('Found ' + allCheckboxes.length + ' checkboxes near question: ' + questionText);
      
      if (allCheckboxes.length > 0) {
        // Strategy A: Try to group by fieldset or common parent
        var fieldsets = searchArea.querySelectorAll('fieldset');
        var processedCheckboxes = [];
        
        // Check if checkboxes are within fieldsets
        fieldsets.forEach(function(fieldset) {
          var fieldsetCheckboxes = fieldset.querySelectorAll('input[type="checkbox"]');
          if (fieldsetCheckboxes.length > 1) {
            // Multiple checkboxes in a fieldset - likely a group
            var options = Array.from(fieldsetCheckboxes).map(function(cb) {
              processedCheckboxes.push(cb); // Mark as processed
              var labelText = '';
              
              // Try multiple ways to find the label
              var label = fieldset.querySelector('label[for="' + cb.id + '"]');
              if (label) {
                labelText = (label.textContent || '').trim();
              } else {
                // Look for label containing the checkbox
                var containingLabel = cb.closest('label');
                if (containingLabel) {
                  labelText = (containingLabel.textContent || '').trim();
                } else {
                  // Look for text in parent div
                  var parent = cb.closest('div');
                  if (parent) {
                    var spans = parent.querySelectorAll('span');
                    if (spans.length > 0) {
                      var lastSpan = spans[spans.length - 1];
                      labelText = (lastSpan && lastSpan.textContent ? lastSpan.textContent.trim() : '');
                    }
                    if (!labelText) {
                      // Try to get text from the parent, excluding nested elements
                      var clonedParent = parent.cloneNode(true);
                      var nestedElements = clonedParent.querySelectorAll('*');
                      nestedElements.forEach(function(el) { el.remove(); });
                      labelText = (clonedParent.textContent || '').trim();
                    }
                  }
                }
              }
              
              labelText = labelText || cb.value || cb.id || 'Option';
              console.log('Checkbox option: ' + labelText + ' (value: ' + cb.value + ')');
              
              return {
                value: cb.value || cb.id || '',
                text: labelText,
                checked: !!cb.checked,
                id: cb.id
              };
            });

            var groupKey = fieldset.id || fieldset.className || ('checkbox_fieldset_' + index);
            var alreadyExists = questions.some(function(q) { return q.type === 'checkbox' && q.element === groupKey; });
            if (!alreadyExists) {
              questions.push({
                type: 'checkbox',
                question: questionText,
                element: groupKey,
                options: options,
                required: false
              });
            }
          }
        });
        
        // Strategy B: Group remaining checkboxes by name or proximity
        var remainingCheckboxes = Array.from(allCheckboxes).filter(function(cb) {
          return processedCheckboxes.indexOf(cb) === -1;
        });
        
        if (remainingCheckboxes.length > 0) {
          var groups = {};
          
          remainingCheckboxes.forEach(function(cb) {
            // Try to group by name first
            var groupName = cb.name;
            if (!groupName) {
              // If no name, try to group by common parent
              var parent = cb.closest('div[class], div[id], section, fieldset');
              groupName = (parent && (parent.id || parent.className)) || ('checkbox_group_' + index);
            }
            
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(cb);
          });

          Object.keys(groups).forEach(function(key) {
            var cbs = groups[key];
            var options = cbs.map(function(cb) {
              var labelText = '';
              var label = searchArea.querySelector('label[for="' + cb.id + '"]');
              if (label) {
                labelText = (label.textContent || '').trim();
              } else {
                var containingLabel = cb.closest('label');
                if (containingLabel) {
                  labelText = (containingLabel.textContent || '').trim();
                } else {
                  var parent = cb.closest('div');
                  if (parent) {
                    var spans = parent.querySelectorAll('span');
                    if (spans.length > 0) {
                      var lastSpan = spans[spans.length - 1];
                      labelText = (lastSpan && lastSpan.textContent ? lastSpan.textContent.trim() : '');
                    }
                    if (!labelText) {
                      var clonedParent = parent.cloneNode(true);
                      var nestedElements = clonedParent.querySelectorAll('*');
                      nestedElements.forEach(function(el) { el.remove(); });
                      labelText = (clonedParent.textContent || '').trim();
                    }
                  }
                }
              }
              
              labelText = labelText || cb.value || cb.id || 'Option';
              console.log('Checkbox option: ' + labelText + ' (value: ' + cb.value + ')');
              
              return {
                value: cb.value || cb.id || '',
                text: labelText,
                checked: !!cb.checked,
                id: cb.id
              };
            });

            var alreadyExists = questions.some(function(q) { return q.type === 'checkbox' && q.element === key; });
            if (!alreadyExists && options.length > 0) {
              questions.push({
                type: 'checkbox',
                question: questionText,
                element: key,
                options: options,
                required: false
              });
            }
          });
        }
      }

      // ARIA role-based custom checkboxes
      var ariaCheckboxes = searchArea.querySelectorAll('[role="checkbox"]');
      if (ariaCheckboxes.length > 0) {
        var options = Array.from(ariaCheckboxes).map(function(el, i) {
          var text = (el.textContent || '').trim() || ('Option ' + (i + 1));
          var value = el.getAttribute('data-value') || text;
          var checked = (el.getAttribute('aria-checked') || '').toLowerCase() === 'true';
          console.log('ARIA checkbox option: ' + text + ' (value: ' + value + ')');
          return { value: value, text: text, checked: checked, id: el.id || '' };
        });

        var key = searchArea.id || ('aria_checkbox_group_' + index);
        var exists = questions.some(function(q) { return q.type === 'checkbox' && q.element === key; });
        if (!exists) {
          questions.push({
            type: 'checkbox',
            question: questionText,
            element: key,
            options: options,
            required: false
          });
        }
      }
    })();
  });

  // Strategy 2: Look for labels with question-like text
  var labels = document.querySelectorAll('label');

  labels.forEach(function(label, index) {
    var labelText = label.textContent.trim();
    if (!labelText || labelText.length < 1) return;

    // Find associated input elements
    var forAttr = label.getAttribute('for');
    var inputElement = null;

    if (forAttr) {
      inputElement = document.getElementById(forAttr);
    } else {
      // Look for inputs within the label or nearby
      inputElement = label.querySelector('input, select, textarea') ||
                    (label.parentElement ? label.parentElement.querySelector('input, select, textarea') : null);
    }

    if (inputElement) {
      var proceedForPattern = (labelText.includes('?') || labelText.toLowerCase().includes('experience') ||
        labelText.toLowerCase().includes('qualification') || labelText.toLowerCase().includes('skill'));
      var proceed = proceedForPattern || (inputElement.type === 'checkbox');
      if (!proceed) return;
      
      if (inputElement.type === 'radio') {
        // Handle radio group
        var radioName = inputElement.name;
        var allRadios = document.querySelectorAll('input[name="' + radioName + '"]');

        var radioOptions = Array.from(allRadios).map(function(radio) {
          var parentEl = radio.parentElement;
          var txt = parentEl && parentEl.textContent ? parentEl.textContent.trim() : radio.value;
          return {
            value: radio.value,
            text: txt,
            checked: radio.checked,
            id: radio.id
          };
        });

        questions.push({
          type: 'radio',
          question: labelText,
          element: radioName,
          options: radioOptions,
          required: inputElement.required
        });
      } else if (inputElement.tagName === 'SELECT') {
        // Handle select dropdown
        var options = Array.from(inputElement.options).map(function(opt) {
          return {
            value: opt.value,
            text: opt.textContent.trim(),
            selected: opt.selected
          };
        });

        questions.push({
          type: 'select',
          question: labelText,
          element: inputElement.id || inputElement.name || ('select_label_' + index),
          options: options,
          required: inputElement.required,
          currentValue: inputElement.value
        });
      } else if (inputElement.type === 'checkbox') {
        // Handle single checkbox
        questions.push({
          type: 'checkbox',
          question: labelText,
          element: inputElement.name || inputElement.id || ('checkbox_' + index),
          options: [{ value: inputElement.value || 'on', text: labelText, checked: inputElement.checked, id: inputElement.id }],
          required: inputElement.required
        });
      } else if (inputElement.tagName === 'TEXTAREA') {
        questions.push({
          type: 'textarea',
          question: labelText,
          element: inputElement.id || inputElement.name || ('textarea_label_' + index),
          required: inputElement.required,
          currentValue: inputElement.value || ''
        });
      } else if (inputElement.tagName === 'INPUT') {
        var inputType = (inputElement.getAttribute('type') || 'text').toLowerCase();
        var normalizedType = ['number','date','email','tel','url','text'].includes(inputType) ? inputType : 'text';
        questions.push({
          type: normalizedType,
          question: labelText,
          element: inputElement.id || inputElement.name || ('input_label_' + index),
          required: inputElement.required,
          currentValue: inputElement.value || ''
        });
      }
    }
  });

  // Remove duplicates based on element identifier
  var uniqueQuestions = [];
  var seenElements = {};

  questions.forEach(function(q) {
    if (!seenElements[q.element]) {
      seenElements[q.element] = true;
      uniqueQuestions.push(q);
    }
  });

  // Debug: Log detailed question data to verify extraction
  uniqueQuestions.forEach(function(q, index) {
    console.log('Question ' + (index + 1) + ': ' + q.question);
    console.log('  Type: ' + q.type + ', Element: ' + q.element);
    if (q.currentValue !== undefined) {
      console.log("  Current Value: '" + q.currentValue + "'");
    }
    var len = Array.isArray(q.options) ? q.options.length : 0;
    console.log('  Options (' + len + '):');
    if (Array.isArray(q.options)) {
      q.options.forEach(function(opt, i) {
        console.log('    ' + (i + 1) + '. Value: ' + "'" + opt.value + "'" + ' | Text: ' + "'" + opt.text + "'" + ' | Selected: ' + (!!opt.selected));
      });
    }
  });

  return {
    questionsFound: uniqueQuestions.length,
    questions: uniqueQuestions,
    pageUrl: window.location.href,
    scrapedAt: new Date().toISOString()
  };
}

// Execute the function and return the result
return extractEmployerQuestions();
