// Form Detection Script using @jalik/form-parser
// CDN: https://cdn.jsdelivr.net/npm/@jalik/form-parser@latest/dist/form-parser.min.js

async function loadFormParserLibrary() {
    // Check if library is already loaded
    if (typeof parseForm !== 'undefined') {
        return true;
    }
    
    // Load the library dynamically
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@jalik/form-parser@latest/dist/form-parser.min.js';
        script.onload = () => {
            console.log('@jalik/form-parser library loaded successfully');
            resolve(true);
        };
        script.onerror = () => {
            console.error('Failed to load @jalik/form-parser library');
            reject(false);
        };
        document.head.appendChild(script);
    });
}

async function detectFormsOnPage() {
    // Try to load the library if not available
    try {
        await loadFormParserLibrary();
    } catch (error) {
        console.error('Could not load @jalik/form-parser library:', error);
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            formsFound: 0,
            forms: [],
            error: '@jalik/form-parser library could not be loaded',
            parser: 'js-form-parser'
        };
    }
    
    // Double-check if the library is now available
    if (typeof parseForm === 'undefined') {
        console.error('@jalik/form-parser library not found after loading attempt.');
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            formsFound: 0,
            forms: [],
            error: '@jalik/form-parser library not available',
            parser: 'js-form-parser'
        };
    }

    const forms = document.querySelectorAll('form');
    const formData = [];

    console.log(`Found ${forms.length} form(s) on the page.`);

    forms.forEach((form, formIndex) => {
        try {
            // Use @jalik/form-parser to get intelligently parsed values
            const parsedFields = parseForm(form, {
                parsing: 'auto',     // Enable smart type parsing (data-type and type attributes)
                trim: true,          // Remove extra whitespace
                nullify: true,       // Convert empty strings to null
                cleanFunction: (value, field) => {
                    // Custom cleaning function
                    if (typeof value === 'string') {
                        // Remove HTML tags and excessive whitespace
                        return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                    }
                    return value;
                },
                filterFunction: (field, parsedValue) => {
                    // Include all fields except buttons (they don't have meaningful values)
                    return !['button', 'submit', 'reset'].includes(field.type);
                }
            });

            const formInfo = {
                formIndex,
                formId: form.id || null,
                formName: form.name || null,
                formClass: form.className || null,
                formAction: form.getAttribute('action') || window.location.href,
                formMethod: (form.getAttribute('method') || 'GET').toUpperCase(),
                formEnctype: form.enctype || 'application/x-www-form-urlencoded',
                formTarget: form.target || null,
                formNoValidate: form.noValidate || false,
                formAutocomplete: form.autocomplete || null,
                
                // Smart parsed field values using @jalik/form-parser
                parsedValues: parsedFields,
                
                // Detailed metadata about form structure
                metadata: extractFormMetadata(form),
                
                // Detailed field information for analysis
                fields: extractDetailedFieldInfo(form)
            };

            formData.push(formInfo);

        } catch (error) {
            console.error(`Error processing form ${formIndex}:`, error);
            
            // Fallback to basic form info
            const basicFormInfo = {
                formIndex,
                formId: form.id || null,
                formName: form.name || null,
                formAction: form.getAttribute('action') || window.location.href,
                formMethod: (form.getAttribute('method') || 'GET').toUpperCase(),
                error: error.message,
                fields: [],
                parsedValues: null
            };
            
            formData.push(basicFormInfo);
        }
    });

    return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        formsFound: formData.length,
        forms: formData,
        parser: '@jalik/form-parser',
        version: '3.x'
    };
}

function extractFormMetadata(form) {
    /**
     * Extract high-level metadata about the form structure
     */
    const fieldsets = form.querySelectorAll('fieldset');
    const allFields = form.querySelectorAll('input, textarea, select, button');
    const requiredFields = form.querySelectorAll('[required]');
    const hiddenFields = form.querySelectorAll('input[type="hidden"]');
    
    // Count field types
    const fieldTypes = {};
    allFields.forEach(field => {
        const type = field.tagName.toLowerCase() === 'input' 
            ? (field.type || 'text') 
            : field.tagName.toLowerCase();
        fieldTypes[type] = (fieldTypes[type] || 0) + 1;
    });

    return {
        totalFields: allFields.length,
        requiredFields: requiredFields.length,
        hiddenFields: hiddenFields.length,
        fieldTypes: fieldTypes,
        hasFieldsets: fieldsets.length > 0,
        fieldsets: Array.from(fieldsets).map((fieldset, index) => {
            const legend = fieldset.querySelector('legend');
            return {
                index,
                disabled: fieldset.disabled,
                name: fieldset.name || null,
                legend: legend ? legend.textContent.trim() : null,
                fieldCount: fieldset.querySelectorAll('input, textarea, select, button').length
            };
        }),
        hasFileUploads: form.querySelector('input[type="file"]') !== null,
        hasMultipleSelects: form.querySelector('select[multiple]') !== null,
        estimatedComplexity: calculateFormComplexity(form)
    };
}

function calculateFormComplexity(form) {
    /**
     * Calculate a complexity score for the form
     */
    let complexity = 0;
    
    const fields = form.querySelectorAll('input, textarea, select');
    complexity += fields.length; // Base complexity
    
    // Add complexity for different field types
    complexity += form.querySelectorAll('input[type="file"]').length * 2;
    complexity += form.querySelectorAll('select[multiple]').length * 2;
    complexity += form.querySelectorAll('textarea').length * 1.5;
    complexity += form.querySelectorAll('fieldset').length * 3;
    
    // Array/object notation adds complexity
    fields.forEach(field => {
        const name = field.name || '';
        if (name.includes('[') && name.includes(']')) {
            complexity += 2; // Array/object notation
        }
    });
    
    if (complexity <= 5) return 'simple';
    if (complexity <= 15) return 'moderate';
    if (complexity <= 30) return 'complex';
    return 'very-complex';
}

function extractDetailedFieldInfo(form) {
    /**
     * Extract detailed information about each field for analysis
     */
    const fields = [];
    const labels = buildLabelMap(form);
    
    const formElements = form.querySelectorAll('input, textarea, select, button');
    
    formElements.forEach((element, index) => {
        const tag = element.tagName.toLowerCase();
        const type = tag === 'input' ? (element.type || 'text') : tag;
        const name = element.name || null;
        const id = element.id || null;
        
        // Get label information
        const labelInfo = getLabelInfo(element, labels);
        
        const fieldData = {
            index,
            tag,
            type,
            id,
            name,
            label: labelInfo.text,
            placeholder: element.placeholder || null,
            required: element.required || labelInfo.required,
            disabled: element.disabled,
            readonly: element.readOnly || false,
            hidden: isHidden(element),
            
            // Data attributes for parsing
            dataType: element.getAttribute('data-type') || null,
            
            // Validation attributes
            validation: {
                pattern: element.pattern || null,
                minLength: element.minLength || null,
                maxLength: element.maxLength || null,
                min: element.min || null,
                max: element.max || null,
                step: element.step || null
            },
            
            // Accessibility
            accessibility: {
                ariaLabel: element.getAttribute('aria-label') || null,
                ariaRequired: element.getAttribute('aria-required') || null,
                ariaInvalid: element.getAttribute('aria-invalid') || null,
                title: element.title || null
            }
        };
        
        // Add type-specific information
        if (type === 'select') {
            fieldData.options = extractSelectOptions(element);
            fieldData.multiple = element.multiple;
            fieldData.size = element.size || null;
        } else if (type === 'radio' || type === 'checkbox') {
            fieldData.checked = element.checked;
            fieldData.value = element.value || null;
            if (name) {
                // Get all options for this radio/checkbox group
                const groupElements = form.querySelectorAll(`input[name="${CSS.escape(name)}"][type="${type}"]`);
                fieldData.groupOptions = Array.from(groupElements).map(el => ({
                    value: el.value || null,
                    checked: el.checked,
                    disabled: el.disabled,
                    id: el.id || null,
                    label: getLabelInfo(el, labels).text
                }));
            }
        } else if (type === 'file') {
            fieldData.accept = element.accept || null;
            fieldData.multiple = element.multiple;
        } else if (type === 'textarea') {
            fieldData.rows = element.rows || null;
            fieldData.cols = element.cols || null;
            fieldData.wrap = element.wrap || null;
        } else if (['button', 'submit', 'reset'].includes(type)) {
            fieldData.text = element.textContent.trim() || element.value || '';
            fieldData.formAction = element.formAction || null;
            fieldData.formMethod = element.formMethod || null;
        }
        
        fields.push(fieldData);
    });
    
    return fields;
}

function buildLabelMap(form) {
    /**
     * Build a mapping of element IDs to their labels
     */
    const labels = new Map();
    
    form.querySelectorAll('label').forEach(label => {
        const labelText = label.textContent.trim();
        const isRequired = labelText.includes('*') || 
                          label.classList.contains('required') ||
                          label.querySelector('.required');
        
        // Handle explicit labels (for attribute)
        const forAttr = label.getAttribute('for');
        if (forAttr) {
            labels.set(forAttr, {
                text: labelText,
                required: isRequired
            });
        } else {
            // Handle implicit labels (nested inputs)
            const nestedInput = label.querySelector('input, textarea, select');
            if (nestedInput && nestedInput.id) {
                labels.set(nestedInput.id, {
                    text: labelText,
                    required: isRequired
                });
            }
        }
    });
    
    return labels;
}

function getLabelInfo(element, labels) {
    /**
     * Get label information for an element
     */
    const elementId = element.id;
    
    if (elementId && labels.has(elementId)) {
        return labels.get(elementId);
    }
    
    // Fallback to ARIA label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        return { text: ariaLabel, required: false };
    }
    
    // Fallback to title attribute
    const title = element.getAttribute('title');
    if (title) {
        return { text: title, required: false };
    }
    
    return { text: null, required: false };
}

function extractSelectOptions(selectElement) {
    /**
     * Extract options from a select element
     */
    const options = [];
    let hasOptGroups = false;
    
    // Handle direct options
    const directOptions = Array.from(selectElement.children).filter(child => 
        child.tagName.toLowerCase() === 'option'
    );
    
    directOptions.forEach(option => {
        options.push({
            type: 'option',
            value: option.hasAttribute('value') ? option.value : option.textContent.trim(),
            text: option.textContent.trim(),
            selected: option.selected,
            disabled: option.disabled,
            hidden: option.hidden
        });
    });
    
    // Handle optgroups
    selectElement.querySelectorAll('optgroup').forEach(optGroup => {
        hasOptGroups = true;
        const groupData = {
            type: 'optgroup',
            label: optGroup.getAttribute('label') || null,
            disabled: optGroup.disabled,
            options: []
        };
        
        optGroup.querySelectorAll('option').forEach(option => {
            groupData.options.push({
                type: 'option',
                value: option.hasAttribute('value') ? option.value : option.textContent.trim(),
                text: option.textContent.trim(),
                selected: option.selected,
                disabled: option.disabled,
                hidden: option.hidden
            });
        });
        
        options.push(groupData);
    });
    
    return {
        hasOptGroups,
        selectedCount: selectElement.selectedOptions ? selectElement.selectedOptions.length : 0,
        totalOptions: selectElement.options ? selectElement.options.length : 0,
        options
    };
}

function isHidden(element) {
    /**
     * Check if an element is hidden
     */
    if (element.type === 'hidden') return true;
    if (element.hidden) return true;
    if (element.style.display === 'none') return true;
    if (element.style.visibility === 'hidden') return true;
    
    // Check computed styles
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        return true;
    }
    
    return false;
}

// Main function that will be called by page.evaluate()
async function main() {
    try {
        return await detectFormsOnPage();
    } catch (error) {
        console.error('Error in form detection:', error);
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            formsFound: 0,
            forms: [],
            error: error.message,
            parser: '@jalik/form-parser'
        };
    }
}

// Execute main function and return result
main();