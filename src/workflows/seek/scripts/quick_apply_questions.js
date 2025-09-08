function extractQA(formElement) {
  const debug = [];
  const results = [];
  
  debug.push("Starting extractQA function");
  debug.push(`Form element type: ${formElement ? formElement.tagName : 'null'}`);
  
  if (!formElement) {
    debug.push("ERROR: No form element provided");
    return { results: [], debug };
  }
  
  // Get the HTML string from the form element
  const formHTMLString = formElement.outerHTML;
  debug.push(`Form HTML length: ${formHTMLString.length}`);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(formHTMLString, "text/html");
  debug.push("HTML parsed successfully");

  const labels = doc.querySelectorAll("label[for] strong");
  debug.push(`Found ${labels.length} label[for] strong elements`);

  labels.forEach((labelEl, index) => {
    debug.push(`Processing label ${index + 1}`);
    
    const question = labelEl.textContent.trim();
    debug.push(`Question text: "${question}"`);
    
    const labelParent = labelEl.closest("label");
    if (!labelParent) {
      debug.push(`ERROR: No parent label found for strong element ${index + 1}`);
      return;
    }
    
    const forAttr = labelParent.getAttribute("for");
    debug.push(`For attribute: "${forAttr}"`);
    
    if (!forAttr) {
      debug.push(`ERROR: No 'for' attribute found on label ${index + 1}`);
      return;
    }
    
    const select = doc.getElementById(forAttr);
    debug.push(`Select element found: ${select ? 'YES' : 'NO'}`);

    let answers = [];
    if (select) {
      debug.push(`Select element tag: ${select.tagName}`);
      const options = select.querySelectorAll("option");
      debug.push(`Found ${options.length} option elements`);
      
      options.forEach((opt, optIndex) => {
        debug.push(`Option ${optIndex}: value="${opt.value}", disabled=${opt.disabled}, text="${opt.textContent.trim()}"`);
      });
      
      answers = Array.from(options)
        .filter(opt => {
          const hasValue = opt.value && opt.value.trim() !== '';
          const notDisabled = !opt.disabled;
          debug.push(`Option filtered: hasValue=${hasValue}, notDisabled=${notDisabled}`);
          return hasValue && notDisabled;
        })
        .map(opt => opt.textContent.trim());
        
      debug.push(`Final answers array: ${JSON.stringify(answers)}`);
    } else {
      debug.push(`ERROR: No select element found with id="${forAttr}"`);
      
      // Try to find what elements exist with IDs
      const allElementsWithId = doc.querySelectorAll('[id]');
      debug.push(`All elements with IDs: ${Array.from(allElementsWithId).map(el => el.id).join(', ')}`);
    }

    results.push({
      question,
      answers,
      forAttribute: forAttr,
      selectFound: !!select
    });
  });

  debug.push(`Final results count: ${results.length}`);
  return { results, debug };
}

// The main execution - call the function with the form element passed from Python
return extractQA(form);