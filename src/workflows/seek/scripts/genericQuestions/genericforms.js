// Enhanced robust form detection script
function detectFormsOnPage() {
    const forms = document.querySelectorAll('form');
    const formData = [];

    console.log(`Found ${forms.length} form(s) on the page.`);

    forms.forEach((form, formIndex) => {
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
            fields: []
        };

        // Get all interactive form elements
        const formElements = form.querySelectorAll(`
            input, textarea, select, button, 
            [contenteditable="true"], [contenteditable=""],
            output, progress, meter
        `);

        // Enhanced label mapping
        const labels = buildLabelMap(form);

        // Process each form element
        formElements.forEach((element, elementIndex) => {
            const fieldData = processFormElement(element, elementIndex, labels, form);
            if (fieldData) {
                formInfo.fields.push(fieldData);
            }
        });

        // Add fieldsets information
        formInfo.fieldsets = processFieldsets(form);

        formData.push(formInfo);
    });

    return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        formsFound: formData.length,
        forms: formData
    };
}

// Enhanced label mapping function
function buildLabelMap(form) {
    const labels = new Map();
    
    form.querySelectorAll('label').forEach(label => {
        // Handle explicit labels (for attribute)
        const forAttr = label.getAttribute('for');
        if (forAttr) {
            labels.set(forAttr, {
                text: label.textContent.trim(),
                required: label.textContent.includes('*') || label.classList.contains('required')
            });
        } else {
            // Handle implicit labels (nested inputs)
            const nestedInput = label.querySelector('input, textarea, select');
            if (nestedInput && nestedInput.id) {
                labels.set(nestedInput.id, {
                    text: label.textContent.trim(),
                    required: label.textContent.includes('*') || label.classList.contains('required')
                });
            }
        }
    });

    return labels;
}

// Process individual form elements
function processFormElement(element, elementIndex, labels, form) {
    const tag = element.tagName.toLowerCase();
    
    // Skip labels as they're processed separately
    if (tag === 'label') return null;

    const elementId = element.id || null;
    const elementName = element.getAttribute('name') || null;
    const elementType = getElementType(element);
    const elementValue = getElementValue(element);
    
    // Get label information
    const labelInfo = getLabelInfo(element, labels);
    
    // Base field data
    const fieldData = {
        index: elementIndex,
        tag,
        type: elementType,
        id: elementId,
        name: elementName,
        value: elementValue,
        placeholder: element.getAttribute('placeholder') || null,
        title: element.getAttribute('title') || null,
        required: element.hasAttribute('required') || labelInfo.required,
        disabled: element.disabled || element.hasAttribute('disabled'),
        readonly: element.readOnly || element.hasAttribute('readonly'),
        hidden: isElementHidden(element),
        class: element.className || null,
        'data-testid': element.getAttribute('data-testid') || null,
        tabindex: element.getAttribute('tabindex') || null,
        label: labelInfo.text,
        validation: getValidationInfo(element),
        accessibility: getAccessibilityInfo(element)
    };

    // Add type-specific data
    switch (elementType) {
        case 'select':
        case 'select-one':
        case 'select-multiple':
            fieldData.options = processSelectOptions(element);
            fieldData.multiple = element.multiple;
            fieldData.size = element.size || null;
            break;
            
        case 'radio':
        case 'checkbox':
            fieldData.checked = element.checked;
            fieldData.options = processRadioCheckboxGroup(element, form);
            break;
            
        case 'file':
            fieldData.accept = element.getAttribute('accept') || null;
            fieldData.multiple = element.multiple;
            fieldData.files = element.files ? Array.from(element.files).map(f => ({
                name: f.name,
                size: f.size,
                type: f.type,
                lastModified: f.lastModified
            })) : [];
            break;
            
        case 'range':
        case 'number':
            fieldData.min = element.getAttribute('min') || null;
            fieldData.max = element.getAttribute('max') || null;
            fieldData.step = element.getAttribute('step') || null;
            break;
            
        case 'textarea':
            fieldData.rows = element.rows || null;
            fieldData.cols = element.cols || null;
            fieldData.wrap = element.wrap || null;
            fieldData.maxlength = element.getAttribute('maxlength') || null;
            fieldData.minlength = element.getAttribute('minlength') || null;
            break;
            
        case 'button':
        case 'submit':
        case 'reset':
            fieldData.text = element.textContent.trim() || element.value;
            fieldData.formaction = element.getAttribute('formaction') || null;
            fieldData.formmethod = element.getAttribute('formmethod') || null;
            break;
    }

    return fieldData;
}

// Enhanced select options processing
function processSelectOptions(selectElement) {
    const options = [];
    let hasOptGroups = false;

    // Process direct option children first
    const directOptions = Array.from(selectElement.children).filter(child => 
        child.tagName.toLowerCase() === 'option'
    );
    
    directOptions.forEach(option => {
        options.push(processOption(option));
    });

    // Process optgroups
    const optGroups = selectElement.querySelectorAll('optgroup');
    if (optGroups.length > 0) {
        hasOptGroups = true;
        optGroups.forEach(optGroup => {
            const groupData = {
                type: 'optgroup',
                label: optGroup.getAttribute('label') || null,
                disabled: optGroup.disabled,
                options: []
            };

            optGroup.querySelectorAll('option').forEach(option => {
                groupData.options.push(processOption(option));
            });

            options.push(groupData);
        });
    }

    return {
        hasOptGroups,
        selectedCount: selectElement.selectedOptions ? selectElement.selectedOptions.length : 0,
        options
    };
}

// Process individual option
function processOption(option) {
    return {
        type: 'option',
        value: option.hasAttribute('value') ? option.value : option.textContent.trim(),
        text: option.textContent.trim(),
        selected: option.selected,
        disabled: option.disabled,
        hidden: option.hidden,
        label: option.getAttribute('label') || null,
        title: option.getAttribute('title') || null
    };
}

// Process radio/checkbox groups
function processRadioCheckboxGroup(element, form) {
    const elementName = element.getAttribute('name');
    if (!elementName) {
        return [{
            value: element.value || null,
            text: element.value || null,
            checked: element.checked,
            disabled: element.disabled
        }];
    }

    const selector = `input[name="${CSS.escape(elementName)}"][type="${element.type}"]`;
    const groupElements = form.querySelectorAll(selector);
    
    return Array.from(groupElements).map(el => ({
        value: el.value || null,
        text: el.value || getLabelText(el) || null,
        checked: el.checked,
        disabled: el.disabled,
        id: el.id || null
    }));
}

// Enhanced utility functions
function getElementType(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === 'input') {
        return element.getAttribute('type') || 'text';
    }
    return tag;
}

function getElementValue(element) {
    const type = getElementType(element);
    
    if (type === 'hidden') {
        return null; // Hide sensitive data
    }
    
    if (type === 'file') {
        return null; // File inputs handled separately
    }
    
    if (element.tagName.toLowerCase() === 'select') {
        if (element.multiple) {
            return Array.from(element.selectedOptions).map(opt => opt.value);
        }
        return element.value || null;
    }
    
    return element.value || element.getAttribute('value') || null;
}

function isElementHidden(element) {
    if (element.type === 'hidden') return true;
    if (element.style.display === 'none') return true;
    if (element.style.visibility === 'hidden') return true;
    if (element.hidden) return true;
    return false;
}

function getLabelInfo(element, labels) {
    const elementId = element.id;
    
    if (elementId && labels.has(elementId)) {
        return labels.get(elementId);
    }
    
    // Fallback to ARIA labels
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        return { text: ariaLabel, required: false };
    }
    
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
        const labelElement = document.getElementById(ariaLabelledBy);
        if (labelElement) {
            return { text: labelElement.textContent.trim(), required: false };
        }
    }
    
    return { text: null, required: false };
}

function getLabelText(element) {
    const labels = document.querySelectorAll(`label[for="${element.id}"]`);
    if (labels.length > 0) {
        return labels[0].textContent.trim();
    }
    
    const parentLabel = element.closest('label');
    if (parentLabel) {
        return parentLabel.textContent.trim();
    }
    
    return element.getAttribute('aria-label') || element.getAttribute('title') || null;
}

function getValidationInfo(element) {
    return {
        pattern: element.getAttribute('pattern') || null,
        minLength: element.getAttribute('minlength') || null,
        maxLength: element.getAttribute('maxlength') || null,
        min: element.getAttribute('min') || null,
        max: element.getAttribute('max') || null,
        step: element.getAttribute('step') || null,
        customValidity: element.validationMessage || null,
        valid: element.checkValidity ? element.checkValidity() : true
    };
}

function getAccessibilityInfo(element) {
    return {
        role: element.getAttribute('role') || null,
        'aria-label': element.getAttribute('aria-label') || null,
        'aria-labelledby': element.getAttribute('aria-labelledby') || null,
        'aria-describedby': element.getAttribute('aria-describedby') || null,
        'aria-required': element.getAttribute('aria-required') || null,
        'aria-invalid': element.getAttribute('aria-invalid') || null,
        'aria-expanded': element.getAttribute('aria-expanded') || null
    };
}

function processFieldsets(form) {
    const fieldsets = form.querySelectorAll('fieldset');
    return Array.from(fieldsets).map((fieldset, index) => {
        const legend = fieldset.querySelector('legend');
        return {
            index,
            disabled: fieldset.disabled,
            name: fieldset.name || null,
            legend: legend ? legend.textContent.trim() : null,
            fieldCount: fieldset.querySelectorAll('input, textarea, select, button').length
        };
    });
}

// Main function that will be called by page.evaluate()
function main() {
    try {
        return detectFormsOnPage();
    } catch (error) {
        console.error('Error in form detection:', error);
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            formsFound: 0,
            forms: [],
            error: error.message
        };
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectFormsOnPage, main };
} else if (typeof window !== 'undefined') {
    window.detectFormsOnPage = detectFormsOnPage;
    window.main = main;
}

// Execute main function and return result for page.evaluate()
main();