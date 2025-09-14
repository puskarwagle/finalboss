// Robust generic form detection script
function detectFormsOnPage() {
	const forms = document.querySelectorAll('form');
	const formData = [];

	console.log(`Found ${forms.length} form(s) on the page.`);

	forms.forEach((form, formIndex) => {
		const formInfo = {
			formIndex,
			formId: form.id || null,
			formClass: form.className || null,
			formAction: form.getAttribute('action') || window.location.href, // default action
			formMethod: (form.getAttribute('method') || 'GET').toUpperCase(),
			fields: []
		};

		// Gather all form elements that could be interactive
		const formElements = form.querySelectorAll('input, textarea, select, button, label');

		// Map labels to inputs
		const labels = {};
		form.querySelectorAll('label').forEach(label => {
			const forAttr = label.getAttribute('for');
			if (forAttr) {
				labels[forAttr] = label.innerText.trim();
			} else {
				const inputInside = label.querySelector('input, textarea, select');
				if (inputInside) {
					const inputId = inputInside.id;
					if (inputId) {
						labels[inputId] = label.innerText.trim();
					}
				}
			}
		});

		formElements.forEach(element => {
			const tag = element.tagName.toLowerCase();

			if (tag === 'label') return; // handled separately

			const elementId = element.id || null;
			const elementName = element.getAttribute('name') || null;
			const elementType = tag === 'input' ? (element.getAttribute('type') || 'text') : tag;
			const elementPlaceholder = element.getAttribute('placeholder') || null;
			const elementValue = element.value ?? element.getAttribute('value') ?? null;
			const elementRequired = element.hasAttribute('required');
			const elementDisabled = element.disabled || element.hasAttribute('disabled');
			const elementClass = element.className || null;
			const elementDataTestid = element.getAttribute('data-testid') || null;

			// Detect hidden inputs (skip if you want)
			const elementHidden = (elementType === 'hidden' || element.type === 'hidden');

			// Find associated label (fallback to ARIA if no <label>)
			let associatedLabel = null;
			if (elementId && labels[elementId]) {
				associatedLabel = labels[elementId];
			} else if (elementName && labels[elementName]) {
				associatedLabel = labels[elementName];
			} else if (element.getAttribute('aria-label')) {
				associatedLabel = element.getAttribute('aria-label');
			} else if (element.getAttribute('title')) {
				associatedLabel = element.getAttribute('title');
			}

			// Handle select / radio / checkbox / button options
			let options = [];
			if (tag === 'select') {
				options = [];
				element.querySelectorAll('option').forEach(opt => {
					const optValue = opt.hasAttribute('value') ? opt.value : opt.textContent.trim();
					const optText = opt.textContent.trim() || null;
					options.push({
						value: optValue || null,
						text: optText,
						selected: opt.selected,
						disabled: opt.disabled
					});
				});
			
				// Handle grouped options too
				element.querySelectorAll('optgroup').forEach(group => {
					const groupLabel = group.getAttribute('label') || null;
					const groupOptions = [];
					group.querySelectorAll('option').forEach(opt => {
						groupOptions.push({
							value: opt.hasAttribute('value') ? opt.value : opt.textContent.trim(),
							text: opt.textContent.trim() || null,
							selected: opt.selected,
							disabled: opt.disabled
						});
					});
					options.push({
						group: groupLabel,
						options: groupOptions
					});
				});
			} else if (elementType === 'radio' || elementType === 'checkbox') {
				if (elementName) {
					const sameNameElements = form.querySelectorAll(`input[name="${CSS.escape(elementName)}"]`);
					sameNameElements.forEach(sameElement => {
						options.push({
							value: sameElement.value || null,
							checked: sameElement.checked,
							disabled: sameElement.disabled
						});
					});
				} else {
					options = [{
						value: elementValue,
						checked: element.checked,
						disabled: elementDisabled
					}];
				}
			} else if (tag === 'button' || elementType === 'button' || elementType === 'submit' || elementType === 'reset') {
				options = [{
					text: element.innerText.trim(),
					type: elementType
				}];
			}

			formInfo.fields.push({
				tag,
				type: elementType,
				id: elementId,
				name: elementName,
				placeholder: elementPlaceholder,
				value: elementHidden ? null : elementValue, // hide hidden field values if needed
				required: elementRequired,
				disabled: elementDisabled,
				hidden: elementHidden,
				class: elementClass,
				data_testid: elementDataTestid,
				label: associatedLabel,
				options
			});
		});

		formData.push(formInfo);
	});

	return {
		formsFound: formData.length,
		forms: formData
	};
}

// Run
detectFormsOnPage();
