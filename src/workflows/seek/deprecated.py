# Select Resume From Dropdown
async def select_resume_from_dropdown(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Find and select the first available resume from the dropdown."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		# Try multiple selectors for the resume dropdown
		resume_selectors = [
			'select[data-testid="select-input"]',
			'select[placeholder*="resumé"], select[placeholder*="resume"]',
			'select[id*=":re:"]',
			'select'
		]
		
		resume_select = None
		selected_selector = None
		
		# Try each selector
		for selector in resume_selectors:
			try:
				locator = page.locator(selector)
				count = await locator.count()
				if count > 0:
					resume_select = locator
					selected_selector = selector
					break
			except Exception as e:
				print(f"Selector error: {e}")
				continue
		
		if resume_select:
			# Get options from the select
			options_script = """
			(function() {
				const select = document.querySelector('""" + selected_selector + """');
				if (!select) return [];
				
				return Array.from(select.options).map(option => ({
					value: option.value,
					text: option.textContent.trim(),
					selected: option.selected
				})).filter(opt => opt.value && opt.value !== '');
			})();
			"""
			
			options = await page.evaluate(options_script)
			
			if options and len(options) > 0:
				# Select the first available resume
				first_resume = options[0]
				await resume_select.select_option(value=first_resume['value'])
				ctx["selected_resume"] = first_resume
				yield "resume_selected"
				return
		
		# If no resume select found, try clicking the resume method change radio button
		resume_method_selectors = [
			'input[data-testid="resume-method-change"][value="change"]',
			'input[type="radio"][name="resume-method"][value="change"]',
			'input[type="radio"][id*=":rb:"][value="change"]',
			'input[type="radio"][name="resume-method"]'
		]
		
		resume_method_change = None
		for selector in resume_method_selectors:
			try:
				locator = page.locator(selector)
				count = await locator.count()
				if count > 0:
					resume_method_change = locator
					break
			except Exception as e:
				print(f"Resume method selector error: {e}")
				continue
		
		if resume_method_change:
			try:
				await resume_method_change.click()
				await asyncio.sleep(3)  # Wait for UI to update
				
				# Now try to find the resume select again
				for selector in resume_selectors:
					try:
						locator = page.locator(selector)
						count = await locator.count()
						if count > 0:
							options_script = """
							(function() {
								const select = document.querySelector('""" + selector + """');
								if (!select) return [];
								
								return Array.from(select.options).map(option => ({
									value: option.value,
									text: option.textContent.trim(),
									selected: option.selected
								})).filter(opt => opt.value && opt.value !== '');
							})();
							"""
							
							options = await page.evaluate(options_script)
							
							if options and len(options) > 0:
								first_resume = options[0]
								await locator.select_option(value=first_resume['value'])
								ctx["selected_resume"] = first_resume
								yield "resume_selected"
								return
					except Exception as e:
						print(f"Post-method change selector error: {e}")
						continue
			except Exception as e:
				print(f"Resume method change error: {e}")
				yield "resume_method_change_error"
				return
		
		yield "no_resume_available"
		
	except Exception as e:
		print(f"Resume selection error: {e}")
		yield "resume_selection_error"

# Click Cover Letter Radio Button
async def click_cover_letter_radio_button(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Click the cover letter radio button using JavaScript strategy."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		click_script = """
		const radio = document.querySelector('input[data-testid="coverLetter-method-change"]');
		if (radio) {
			// Try multiple click methods
			radio.click();
			radio.checked = true;
			
			// Dispatch change event
			const changeEvent = new Event('change', { bubbles: true });
			radio.dispatchEvent(changeEvent);
			
			// Dispatch click event
			const clickEvent = new Event('click', { bubbles: true });
			radio.dispatchEvent(clickEvent);
			
			return true;
		}
		return false;
		"""
		
		success = await page.evaluate(click_script)
		if success:
			await asyncio.sleep(1)  # Brief pause for textarea to appear
			yield "radio_button_clicked"
		else:
			yield "radio_button_not_found"
		
	except Exception as e:
		print(f"Radio button click error: {e}")
		yield "radio_button_click_error"

# Fill Cover Letter Textarea
async def fill_cover_letter_textarea(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Fill the cover letter textarea with template content."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		# Get cover letter template from config
		base_dir = ctx.get("base_dir") or str(Path(__file__).resolve().parents[2])
		settings = load_settings(base_dir, "seek")
		app_settings = settings.get("application_settings", {}) if isinstance(settings, dict) else {}
		cover_letter_template = app_settings.get("cover_letter_template", "")
		
		# Default cover letter if none provided
		if not cover_letter_template:
			cover_letter_template = """Dear Hiring Manager,

			I am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.

			I am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.

			Thank you for your consideration.

			Best regards,
			[Your Name]"""
		
		# Fill the textarea
		textarea = page.locator('textarea[data-testid="coverLetterTextInput"]')
		if await textarea.count() > 0:
			await textarea.fill(cover_letter_template)
			ctx["cover_letter_filled"] = True
			yield "cover_letter_filled"
		else:
			yield "cover_letter_textarea_not_found"
		
	except Exception as e:
		print(f"Cover letter fill error: {e}")
		yield "cover_letter_fill_error"

# Handle Answer Employer Questions
async def handle_answer_employer_questions(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Handle the 'Answer employer questions' step with detection and parsing."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		print("Starting employer questions detection...")
		
		# Check if there are any forms on the page first
		form_count = await page.evaluate("document.querySelectorAll('form').length")
		print(f"Found {form_count} forms on the page")
		
		if form_count == 0:
			print("No forms found on page")
			yield "no_employer_questions_found"
			return
		
		# Use Jalik form-parser for form detection
		forms_data = await detect_forms_helper_jalik(page)
		
		if forms_data and forms_data.get("formsFound", 0) > 0:
			# Store the parsed data in context for potential use
			ctx["employer_forms_data"] = forms_data
			
			# Print form information in human-readable format
			print(f"\n🎯 Found {forms_data['formsFound']} form(s) using Jalik form-parser")
			print("=" * 60)
			
			for i, form in enumerate(forms_data["forms"], 1):
				print(f"\n📋 FORM {i}: {form['formId'] or 'No ID'}")
				print(f"   Action: {form['formAction'] or 'Not specified'}")
				print(f"   Method: {form['formMethod']}")
				print(f"   Fields: {len(form.get('fields', []))}")
				
				# Print each field in a readable format
				for field in form.get('fields', []):
					field_type = field['type']
					field_label = field['label'] or field['name'] or field['id'] or 'Unlabeled'
					required = " (Required)" if field['required'] else ""
					
					print(f"\n   🔹 {field_type.upper()}: {field_label}{required}")
					
					# Show select options if available
					if field_type == 'select' and field.get('options'):
						options = field['options']
						print(f"      Options ({len(options)}):")
						for opt in options:
							selected = " ✓" if opt['selected'] else ""
							opt_text = opt['text'] or opt['value'] or 'Empty option'
							print(f"        • {opt_text}{selected}")
					
					# Show other field details
					if field.get('placeholder'):
						print(f"      Placeholder: {field['placeholder']}")
					if field.get('value'):
						print(f"      Value: {field['value']}")
			
			print("\n" + "=" * 60)
			yield "employer_questions_detected"
		else:
			print("No forms detected by Jalik")
			yield "no_employer_questions_found"
		
	except Exception as e:
		print(f"Answer employer questions error: {e}")
		yield "employer_questions_error"








