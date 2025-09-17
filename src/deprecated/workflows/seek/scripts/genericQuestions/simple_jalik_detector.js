// Simple Jalik Form Detector
// More robust integration with better error handling

async function detectFormsSimple() {
    try {
        console.log('Starting Jalik form detection...');
        
        // Check if Jalik library is already loaded
        if (typeof parseForm === 'undefined') {
            console.log('Loading Jalik form-parser library...');
            await loadJalikLibrary();
        }
        
        // Double check if library loaded
        if (typeof parseForm === 'undefined') {
            console.error('Failed to load Jalik library');
            return {
                formsFound: 0,
                forms: [],
                error: 'Jalik library not available',
                parser: 'jalik-simple'
            };
        }
        
        console.log('Jalik library loaded successfully');
        
        // Find all forms
        const forms = document.querySelectorAll('form');
        console.log(`Found ${forms.length} forms on page`);
        
        const formData = [];
        
        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            console.log(`Processing form ${i + 1}:`, form.id || 'no-id');
            
            try {
                // Use Jalik to parse the form
                const parsedData = parseForm(form);
                console.log('Parsed data:', parsedData);
                
                // Get basic form info
                const formInfo = {
                    formIndex: i,
                    formId: form.id || null,
                    formName: form.name || null,
                    formAction: form.action || null,
                    formMethod: form.method || 'GET',
                    fields: [],
                    parsedValues: parsedData,
                    parser: 'jalik-simple'
                };
                
                // Extract field information
                const fields = form.querySelectorAll('input, textarea, select, button');
                console.log(`Found ${fields.length} fields in form ${i + 1}`);
                
                for (let j = 0; j < fields.length; j++) {
                    const field = fields[j];
                    const fieldInfo = {
                        index: j,
                        tag: field.tagName.toLowerCase(),
                        type: field.type || field.tagName.toLowerCase(),
                        id: field.id || null,
                        name: field.name || null,
                        value: field.value || null,
                        required: field.required || false,
                        disabled: field.disabled || false,
                        placeholder: field.placeholder || null,
                        label: getFieldLabel(field, form)
                    };
                    
                    // Add select options if it's a select
                    if (field.tagName.toLowerCase() === 'select') {
                        fieldInfo.options = getSelectOptions(field);
                    }
                    
                    formInfo.fields.push(fieldInfo);
                }
                
                formData.push(formInfo);
                console.log(`Successfully processed form ${i + 1}`);
                
            } catch (formError) {
                console.error(`Error processing form ${i + 1}:`, formError);
                formData.push({
                    formIndex: i,
                    formId: form.id || null,
                    formName: form.name || null,
                    error: formError.message,
                    fields: [],
                    parser: 'jalik-simple'
                });
            }
        }
        
        console.log(`Form detection complete. Found ${formData.length} forms`);
        
        return {
            formsFound: formData.length,
            forms: formData,
            parser: 'jalik-simple',
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
    } catch (error) {
        console.error('Error in form detection:', error);
        return {
            formsFound: 0,
            forms: [],
            error: error.message,
            parser: 'jalik-simple'
        };
    }
}

// Load Jalik library
async function loadJalikLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@jalik/form-parser@latest/dist/form-parser.min.js';
        script.onload = () => {
            console.log('Jalik library loaded successfully');
            resolve();
        };
        script.onerror = () => {
            console.error('Failed to load Jalik library');
            reject(new Error('Failed to load Jalik library'));
        };
        document.head.appendChild(script);
    });
}

// Get field label
function getFieldLabel(field, form) {
    // Try to find label by for attribute
    if (field.id) {
        const label = form.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.trim();
        }
    }
    
    // Try to find parent label
    const parentLabel = field.closest('label');
    if (parentLabel) {
        return parentLabel.textContent.trim();
    }
    
    // Try aria-label
    if (field.getAttribute('aria-label')) {
        return field.getAttribute('aria-label');
    }
    
    return null;
}

// Get select options
function getSelectOptions(select) {
    const options = [];
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        options.push({
            value: option.value,
            text: option.textContent.trim(),
            selected: option.selected
        });
    }
    return options;
}

// Execute the detection
detectFormsSimple(); 