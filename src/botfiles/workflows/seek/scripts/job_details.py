from __future__ import annotations
import os
import asyncio
from typing import Any, Dict, Optional, AsyncGenerator

# ------------------------
# Pure-Python parsing utilities
# ------------------------

def parse_job_title_with_svg_markers(title_text: str) -> Dict[str, Any]:
    """Parse structured fields from the job header text blob."""
    lines = title_text.split('\n') if title_text else []
    lines = [l.strip() for l in lines if l.strip()]

    parsed: Dict[str, Any] = {
        "title": "",
        "company": "",
        "location": "",
        "work_type": "",
        "category": "",
        "duration": "",
        "salary_note": "",
        "posted": "",
        "application_volume": "",
    }

    if not lines:
        return parsed

    # First line is title
    parsed["title"] = lines[0]

    # Second line often company
    if len(lines) >= 2:
        parsed["company"] = lines[1]

    # Find "Posted" and application volume markers
    svg_data_start_index = 2
    posted_index = -1
    application_volume_index = -1

    for i in range(svg_data_start_index, len(lines)):
        if lines[i].lower().startswith("posted") or "ago" in lines[i]:
            posted_index = i
            parsed["posted"] = lines[i].replace("Posted ", "", 1).replace("posted ", "", 1)
            break

    for i in range(len(lines)):
        if "application volume" in lines[i].lower():
            application_volume_index = i
            parsed["application_volume"] = lines[i]
            break

    structured_end_index = posted_index if posted_index > 0 else len(lines)
    structured_data = []

    for i in range(svg_data_start_index, structured_end_index):
        line = lines[i]
        if _is_rating_or_review(line):
            continue
        structured_data.append(line)

    if len(structured_data) >= 1:
        parsed["location"] = structured_data[0]
    if len(structured_data) >= 2:
        parsed["work_type"] = structured_data[1]
    if len(structured_data) >= 3:
        parsed["category"] = structured_data[2]
    if len(structured_data) >= 4:
        if "$" in structured_data[3] or "salary" in structured_data[3].lower():
            parsed["salary_note"] = structured_data[3]

    for item in structured_data:
        if "$" in item and not parsed["salary_note"]:
            parsed["salary_note"] = item
            break

    return parsed


def _is_rating_or_review(line: str) -> bool:
    import re
    patterns = [
        r"^\d+\.\d+$",
        r"^\d+\s+reviews?$",
        r"^·$",
    ]
    for pattern in patterns:
        if re.match(pattern, line.strip()):
            return True
    return False


def clean_unwanted_content(text: str) -> str:
    if not text:
        return ""
    unwanted_lines = [
        "View all jobs",
        "Quick apply",
        "Apply",
        "Save",
        "Report this job advert",
        "Be careful",
        "Don't provide your bank or credit card details when applying for jobs.",
        "Learn how to protect yourself",
        "Report this job ad",
        "Career Advice",
    ]
    lines = text.split('\n')
    cleaned_lines = [line for line in lines if line.strip() not in unwanted_lines]
    return '\n'.join(cleaned_lines)


def split_title_and_details(text: str) -> tuple[str, str]:
    if not text:
        return "", ""
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if line.strip() in ["Quick apply", "Apply"]:
            title = '\n'.join(lines[:i]).strip()
            details = '\n'.join(lines[i:]).strip()
            return title, details
    return text, ""


def format_job_data(parsed_job: Dict[str, Any], details: str, job_index: Optional[int] = None) -> Dict[str, Any]:
    return {
        "job_index": job_index,
        "job": {
            "title": parsed_job.get("title", ""),
            "company": parsed_job.get("company", ""),
            "location": parsed_job.get("location", ""),
            "work_type": parsed_job.get("work_type", ""),
            "category": parsed_job.get("category", ""),
            "posted": parsed_job.get("posted", ""),
            "salary_note": parsed_job.get("salary_note", ""),
            "application_volume": parsed_job.get("application_volume", ""),
        },
        "details": details,
    }

# Scan Employer Questions
async def quick_apply_employer_questions(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Find and scan employer question forms with select dropdowns and radio inputs."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		form_scan_script = """
		// Find all questions on the page (not just in forms)
		let questions = [];
		
		// Look for strong tags that contain questions
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
					element: select.id || select.name || `select_${index}`,
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
					const label = radioContainer.querySelector(`label[for="${radio.id}"]`);
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
		
		return {
			questionsFound: questions.length,
			questions: questions
		};
		"""
		
		result = await page.evaluate(form_scan_script)
		
		if not result or result['questionsFound'] == 0:
			yield "no_questions_found"
			return
		
		# Store questions in context for potential use by other steps
		ctx["employer_questions"] = result['questions']
		ctx["questions_count"] = result['questionsFound']
		
		yield f"questions_scanned: {result['questionsFound']}_found"
		
	except Exception as e:
		print(f"Questions scan error: {e}")
		yield "questions_scan_error"

# ------------------------ Deprecated -----------------

async def get_available_steps(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """Yield all available steps in the progress bar."""
    page = ctx.get("quick_apply_page")
    if not page:
        yield "no_quick_apply_page"
        return
    try:
        progress_script = """
        () => {
            const nav = document.querySelector('nav[aria-label="Progress bar"]');
            if (!nav) return null;
            const quickApplySteps = Array.from(nav.querySelectorAll('li button')).map((button, index) => {
                const stepText = button.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
                return {
                    index: index + 1,
                    text: stepText
                };
            });
            return quickApplySteps;
        }
        """
        quick_apply_steps = await page.evaluate(progress_script)
        if not quick_apply_steps:
            print("Quick Apply progress bar not found")
            yield "quick_apply_progress_bar_not_found"
            return
        ctx["quick_apply_available_steps"] = quick_apply_steps
        for step in quick_apply_steps:
            print(f"Step {step['index']}: {step['text']}")
        yield "quick_apply_steps_listed"
    except Exception as e:
        print(f"Error getting Quick Apply available steps: {e}")
        yield "quick_apply_steps_listing_error"

async def get_current_step(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """Yield the current step in the progress bar."""
    page = ctx.get("quick_apply_page")
    if not page:
        yield "no_quick_apply_page"
        return
    try:
        progress_script = """
        () => {
            const nav = document.querySelector('nav[aria-label="Progress bar"]');
            if (!nav) return null;
            const quickApplyCurrentStep = nav.querySelector('li button[aria-current="step"]');
            if (!quickApplyCurrentStep) return null;
            const stepText = quickApplyCurrentStep.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
            return stepText;
        }
        """
        quick_apply_current_step_text = await page.evaluate(progress_script)
        if quick_apply_current_step_text:
            ctx["quick_apply_current_step_text"] = quick_apply_current_step_text
            print(f"Quick Apply current step: '{quick_apply_current_step_text}'")
            yield "quick_apply_current_step_obtained"
        else:
            print("No Quick Apply current step found")
            yield "quick_apply_current_step_not_found"
    except Exception as e:
        print(f"Error getting Quick Apply current step: {e}")
        yield "quick_apply_current_step_error"

