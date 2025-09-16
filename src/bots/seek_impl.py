from __future__ import annotations
import re
from pathlib import Path
from typing import Any, Dict, AsyncGenerator, Optional

import asyncio

# from helpers.config_manager import load_settings, load_json_file
from ..botfiles.workflows.seek.scripts.job_details import (
	clean_unwanted_content,
	split_title_and_details,
	parse_job_title_with_svg_markers,
	format_job_data,
	quick_apply_employer_questions,
)
# from .scripts.genericQuestions.formsBeautifulshup_fixed import detect_forms_helper_python
# from .quick_apply_utils import get_available_resume_options

BASE_URL = "https://www.seek.com.au"

# Utility (pure function, kept here for clarity)

def _slugify(text: str) -> str:
	if not text:
		return ""
	text = text.strip().lower()
	text = re.sub(r"[^a-z0-9]+", "-", text)
	text = re.sub(r"-+", "-", text)
	return text.strip("-")


# -----------------------------
# Steps only (no separate helpers)
# -----------------------------

# Step0
async def step0(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Load selector JSON and compute search URL from config, then open page."""
	base_dir = ctx.get("base_dir") or str(Path(__file__).resolve().parents[2])
	selectors_path = str(Path(__file__).resolve().parent / "seek_selectors.json")
	ctx["selectors"] = load_json_file(selectors_path) or {}
	settings = load_settings(base_dir, "seek")
	prefs = settings.get("job_preferences", {}) if isinstance(settings, dict) else {}
	kws = prefs.get("keywords", [])
	locs = prefs.get("locations", [])
	keyword = (kws[0] if isinstance(kws, list) and kws else (kws if isinstance(kws, str) else ""))
	location = (locs[0] if isinstance(locs, list) and locs else (locs if isinstance(locs, str) else ""))
	kw_slug = _slugify(str(keyword))
	loc_slug = _slugify(str(location))
	path = f"/{kw_slug}-jobs" if kw_slug else "/jobs"
	if loc_slug:
		path += f"/in-{loc_slug}"
	ctx["seek_url"] = f"{BASE_URL}{path}"
	yield "ctx_ready"


# Open Homepage
async def open_homepage(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Open Seek homepage in a new page/tab."""
	context = ctx.get("browser_context")
	if not context:
		yield "no_browser_context"
		return
	page = await context.new_page()
	ctx["page"] = page
	try:
		await page.goto(ctx.get("seek_url") or f"{BASE_URL}/jobs", wait_until="domcontentloaded")
		yield "homepage_opened"
	except Exception as e:
		print(f"Failed to open homepage: {e}")
		yield "page_navigation_failed"


# Refresh Page
async def refresh_page(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Refresh the current page."""
	page = ctx.get("page")
	if not page:
		yield "no_page_to_refresh"
		return
	try:
		await page.reload(wait_until="domcontentloaded")
		yield "page_refreshed"
	except Exception as e:
		print(f"Failed to refresh page: {e}")
		yield "page_reload_failed"


# Wait For Page Load
async def wait_for_page_load(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Wait for load states, tolerant of networkidle failures."""
	page = ctx.get("page")
	if not page:
		yield "page_load_retry"
		return
	try:
		await page.wait_for_load_state("load")
		try:
			await page.wait_for_load_state("networkidle")
		except Exception:
			pass
		yield "page_loaded"
	except Exception:
		yield "page_load_retry"


# Detect Page State
async def detect_page_state(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Detect if job cards exist; if not, detect sign-in prompt."""
	page = ctx.get("page")
	selectors = ctx.get("selectors") or {}
	if not page:
		yield "no_cards_found"
		return
	job_card_selectors = selectors.get("job_cards", []) or []
	for sel in job_card_selectors:
		try:
			els = await page.query_selector_all(sel)
			if els:
				yield "cards_present"
				return
		except Exception:
			pass
	# check sign-in
	sign_in_selectors = selectors.get("sign_in_link", []) or []
	for sel in sign_in_selectors:
		try:
			el = await page.query_selector(sel)
			if el:
				yield "sign_in_required"
				return
		except Exception:
			pass
	yield "no_cards_found"


# Show Sign In Banner
async def show_sign_in_banner(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Focus dashboard and show sign-in banner."""
	context = ctx.get("browser_context")
	if not context:
		yield "signin_banner_retry"
		return
	ui_page = None
	try:
		for p in context.pages:
			if "127.0.0.1:6666" in (p.url or ""):
				ui_page = p
				break
	except Exception:
		pass
	if ui_page is None:
		ui_page = await context.new_page()
		try:
			await ui_page.goto("http://127.0.0.1:6666/")
		except Exception:
			pass
	try:
		await ui_page.bring_to_front()
	except Exception:
		pass
	try:
		await ui_page.evaluate("""
	(() => {
		const id = 'guu-signin-banner';
		if (document.getElementById(id)) return;
		const div = document.createElement('div');
		div.id = id;
		div.textContent = 'Please sign in to seek.com in the other tab, then resume the bot.';
		Object.assign(div.style, { position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', background: '#b45309', color: '#fff', padding: '10px 14px', borderRadius: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.4)', zIndex: 2147483647 });
		document.body.appendChild(div);
		setTimeout(() => { try { div.remove(); } catch(e) {} }, 15000);
	})();
	""")
	except Exception:
		pass
	yield "signin_banner_shown"


# Collect Job Cards
async def collect_job_cards(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Find and store job cards, initialize index."""
	page = ctx.get("page")
	selectors = ctx.get("selectors") or {}
	if not page:
		yield "cards_collect_retry"
		return
	cards: list = []
	for sel in (selectors.get("job_cards", []) or []):
		try:
			await page.wait_for_selector(sel, state="attached")
			found = await page.query_selector_all(sel)
			if found:
				cards = found; break
		except Exception:
			continue
	if not cards:
		yield "cards_collect_retry"
		return
	ctx["job_cards"] = cards
	if "job_index" not in ctx:
		ctx["job_index"] = 0
	yield "cards_collected"


# Click Job Card
async def click_job_card(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Click the job card at current index and advance index."""
	page = ctx.get("page")
	cards = ctx.get("job_cards") or []
	if not page or not cards:
		yield "job_card_skipped"
		return
	index = int(ctx.get("job_index", 0) or 0)
	try:
		target = cards[index] if index < len(cards) else None
		if not target:
			yield "job_card_skipped"
			return
		try:
			await target.scroll_into_view_if_needed()
		except Exception:
			pass
		await target.click()
	except Exception:
		pass
	ctx["job_index"] = index + 1
	yield "job_card_clicked"


# Wait For Details Panel
async def wait_for_details_panel(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Wait for job details panel to be present and content-loaded."""
	page = ctx.get("page")
	selectors = ctx.get("selectors") or {}
	if not page:
		yield "details_panel_retry"
		return
	selector = selectors.get("job_details_panel")
	if not selector:
		yield "details_panel_retry"
		return
	try:
		await page.wait_for_selector(selector, state="attached")
	except Exception:
		yield "details_panel_retry"
		return
	check_js = """
		(sel) => {
			const container = document.querySelector(sel);
			return !!(container && container.innerText && container.innerText.trim().length > 50);
		}
		"""
	for attempt in range(5):
		try:
			ready = await page.evaluate(check_js, selector)
			if ready:
				yield "details_panel_ready"
				return
		except Exception:
			pass
		await asyncio.sleep(0.1 * (2 ** attempt))
	yield "details_panel_retry"


# Detect Quick Apply
async def detect_quick_apply(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Detect Quick Apply vs Regular Apply button on Seek job page."""
	page = ctx.get("page")
	if not page:
		ctx["quick_apply_flags"] = {"hasQuickApply": False, "hasRegularApply": False}
		yield "qa: quick=False regular=False"
		yield "apply_missing"
		return

	# Grab all apply buttons by stable attribute
	btns = page.locator('[data-automation="job-detail-apply"]')
	count = await btns.count()

	if count == 0:
		ctx["quick_apply_flags"] = {"hasQuickApply": False, "hasRegularApply": False}
		yield "qa: quick=False regular=False"
		yield "apply_missing"
		return

	has_quick = False
	for i in range(count):
		txt = (await btns.nth(i).inner_text()).lower()
		txt = re.sub(r"[\u00A0\u2000-\u200D\u202F\u2060]", " ", txt)  # normalize spaces
		if "quick apply" in txt:
			has_quick = True
			break

	ctx["quick_apply_flags"] = {
		"hasQuickApply": has_quick,
		"hasRegularApply": not has_quick,
		"quickApplyCount": 1 if has_quick else 0,
	}

	yield f"qa: quick={has_quick} regular={not has_quick} count={count}"
	yield "quick_apply_found" if has_quick else "regular_apply_found"


async def generic_forms_lions(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Handle generic forms for Lions."""
	page = ctx.get("page")
	if not page:
		yield "no_page"
		return
	
	print("Starting Generic questions detection...")
	try:
		script_path = Path(__file__).resolve().parent / "scripts" / "generic_form_detector.js"
		js_code = script_path.read_text(encoding="utf-8")
	except Exception as e:
		yield "Generic_questions_script_error"
		return
	
	# Implement the logic for handling generic forms
	print("Questions and answers detected:")
	yield "generic_forms_handled"


# Extract Job Details Raw
async def extract_job_details_raw(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Extract raw job details using the JS extractor and store in ctx['job_details_raw']."""
	page = ctx.get("page")
	if not page:
		ctx["job_details_raw"] = {"raw_title": "", "details": "", "totalChars": 0, "debug_info": {}}
		yield "extracted: (no page)"
		yield "details_extracted"
		return
	# Load extractor script from workflows/seek/scripts
	script_path = Path(__file__).resolve().parent / "scripts" / "job_content_extractor.js"
	try:
		js = script_path.read_text(encoding="utf-8")
	except Exception:
		js = ""
	if not js:
		ctx["job_details_raw"] = {"raw_title": "", "details": "", "totalChars": 0, "debug_info": {}}
		yield "extracted: (no script)"
		yield "details_extracted"
		return
	try:
		result = await page.evaluate(js + "\nreturn extractJobContent();")
		raw_title = (result or {}).get("raw_title") or ""
		details = (result or {}).get("details") or ""
		total = int((result or {}).get("totalChars") or len(details))
		ctx["job_details_raw"] = {
				"raw_title": raw_title,
			"details": details,
			"totalChars": total,
			"debug_info": (result or {}).get("debug_info") or {},
		}
		preview_title = (raw_title.replace("\n", " ")[:80] + ("…" if len(raw_title) > 80 else "")) if raw_title else "(no title)"
		preview_len = total
		yield f"extracted: title={preview_title} · chars={preview_len}"
		yield "details_extracted"
		return
	except Exception as e:
		# Fallback: try to pull innerText of the details container directly
		selectors = ctx.get("selectors") or {}
		selector = selectors.get("job_details_panel")
		details_text = ""
		try:
			if selector:
				details_text = await page.evaluate("(sel)=>{const el=document.querySelector(sel); return el? el.innerText:'';}", selector)
		except Exception:
			pass
		# Heuristic title: first non-empty line until an Apply/Quick apply marker
		lines = [l.strip() for l in (details_text or "").split("\n") if l.strip()]
		title_lines = []
		for l in lines:
			if l in ("Quick apply", "Apply", "Save"): break
			title_lines.append(l)
		raw_title = "\n".join(title_lines[:5])
		total = len(details_text or "")
		ctx["job_details_raw"] = {
			"raw_title": raw_title or "",
			"details": details_text or "",
			"totalChars": total,
			"debug_info": {"fallback": True, "error": str(e)[:200]},
		}
		preview_title = (raw_title.replace("\n", " ")[:80] + ("…" if len(raw_title) > 80 else "")) if raw_title else "(no title)"
		yield f"extracted: (fallback) title={preview_title} · chars={total}"
	yield "details_extracted"


# Parse Job Details
async def parse_job_details(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Parse and format the previously extracted raw job details into structured data."""
	raw = ctx.get("job_details_raw") or {}
	raw_title = (raw.get("raw_title") or "").strip()
	raw_details = (raw.get("details") or "").strip()

	# If raw_title is empty, attempt to split from details
	if not raw_title and raw_details:
		title_guess, remaining = split_title_and_details(raw_details)
		raw_title = title_guess.strip()
		raw_details = remaining.strip() if remaining else raw_details

	# Clean up details content (remove UI buttons, banners etc.)
	cleaned_details = clean_unwanted_content(raw_details)

	# Parse structured fields from the title blob
	parsed_job = parse_job_title_with_svg_markers(raw_title)

	# Format into unified job dict, and store/append into context
	job_index_zero_based = int(ctx.get("job_index", 1)) - 1
	formatted = format_job_data(parsed_job, cleaned_details, job_index=job_index_zero_based)

	ctx["last_job_data"] = formatted
	jobs_list = ctx.get("jobs_collected")
	if not isinstance(jobs_list, list):
		jobs_list = []
	jobs_list.append(formatted)
	ctx["jobs_collected"] = jobs_list

	yield "parsed"


# Click Quick Apply
async def click_quick_apply(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:

	page = ctx.get("page")
	browser_context = ctx.get("browser_context")
	flags = ctx.get("quick_apply_flags", {})
	if not page or not browser_context:
		yield "missing_page_or_context"
		return

	ctx["original_job_search_page"] = page

	try:
		btns = page.locator('[data-automation="job-detail-apply"]')
		count = await btns.count()
		pages_before = len(browser_context.pages)

		# Click the first matching button
		if flags.get("hasQuickApply"):
			for i in range(count):
				txt = (await btns.nth(i).inner_text()).lower()
				txt = re.sub(r"[\u00A0\u2000-\u200D\u202F\u2060]", " ", txt)
				if "quick apply" in txt:
					await btns.nth(i).scroll_into_view_if_needed()
					await btns.nth(i).click()
					await asyncio.sleep(0.4)
					pages_after = len(browser_context.pages)
					if pages_after > pages_before:
						new_page = browser_context.pages[-1]
						ctx["quick_apply_page"] = new_page
						ctx["page"] = new_page
						yield "quick_apply_clicked"
						return
					else:
						yield "new_tab_not_opened"
						return
			yield "no_quick_apply_button_found"
			return

		if flags.get("hasRegularApply"):
			for i in range(count):
				txt = (await btns.nth(i).inner_text()).lower()
				txt = re.sub(r"[\u00A0\u2000-\u200D\u202F\u2060]", " ", txt)
				if "quick apply" not in txt:
					await btns.nth(i).scroll_into_view_if_needed()
					await btns.nth(i).click()
					await asyncio.sleep(0.4)
					pages_after = len(browser_context.pages)
					if pages_after > pages_before:
						new_page = browser_context.pages[-1]
						ctx["quick_apply_page"] = new_page
						ctx["page"] = new_page
						yield "regular_apply_clicked"
						return
					else:
						yield "new_tab_not_opened"
						return
			yield "no_regular_apply_button_found"
			return
	except Exception as e:
		print(f"Quick/Regular apply click error: {e}")
		yield "quick_apply_error"


# Wait For Quick Apply Page
async def wait_for_quick_apply_page(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Wait for the Quick Apply page to load and be ready."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		# Wait for the page to load
		await page.wait_for_load_state("domcontentloaded")
		
		# Wait for Quick Apply form elements to be present
		try:
			await page.wait_for_selector('select[data-testid="select-input"], nav[aria-label="Progress bar"]', timeout=10000)
			yield "quick_apply_page_ready"
		except Exception:
			# Fallback: just wait a bit more and proceed
			await asyncio.sleep(2)
			yield "quick_apply_page_ready"
			
	except Exception as e:
		print(f"Quick apply page load error: {e}")
		yield "page_load_timeout"


# Get Available Steps (unused)
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


# Handle Resume Selection
async def handle_resume_selection(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Handle resume selection in Quick Apply flow."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		# Try multiple selectors for the resume dropdown
		resume_selectors = [
			# Generic data-testid selector
			'select[data-testid="select-input"]',
			# Look for select with placeholder text
			'select[placeholder*="resumé"], select[placeholder*="resume"]',
			# Look for select with specific ID pattern
			'select[id*=":re:"]',
			# Look for any select element
			'select'
		]
		
		resume_select = None
		selected_selector = None
		
		# Try each selector
		for selector in resume_selectors:
			try:
				locator = page.locator(selector)
				count = await locator.count()
				print(f"Selector '{selector}' found {count} elements")
				if count > 0:
					resume_select = locator
					selected_selector = selector
					break
			except Exception as e:
				print(f"Error with selector '{selector}': {e}")
				continue
		
		if resume_select:
			# Try to get options directly from the page
			try:
				# Fixed JavaScript syntax - removed the return statement issue
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
				print(f"Found {len(options) if options else 0} options in resume select")
				
				if options and len(options) > 0:
					# Select the first available resume
					first_resume = options[0]
					print(f"Selecting resume: {first_resume}")
					await resume_select.select_option(value=first_resume['value'])
					yield "resume_selected"
					return
				else:
					print(f"No options found in resume select with selector: {selected_selector}")
					yield "no_resume_options_available"
					return
			except Exception as e:
				print(f"Error getting options from resume select: {e}")
				yield "resume_options_error"
				return
		
		# If no resume select found or no options, try clicking the resume method change radio button
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
				print(f"Resume method selector '{selector}' found {count} elements")
				if count > 0:
					resume_method_change = locator
					break
			except Exception as e:
				print(f"Error with resume method selector '{selector}': {e}")
				continue
		
		if resume_method_change:
			try:
				print("Clicking resume method change button")
				await resume_method_change.click()
				await asyncio.sleep(3)  # Wait longer for UI to update
				
				# Now try to find the resume select again with all selectors
				for selector in resume_selectors:
					try:
						locator = page.locator(selector)
						count = await locator.count()
						print(f"After method change - selector '{selector}' found {count} elements")
						if count > 0:
							# Try to get options directly with fixed JavaScript
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
							print(f"After method change - found {len(options) if options else 0} options")
							
							if options and len(options) > 0:
								# Select the first available resume
								first_resume = options[0]
								print(f"After method change - selecting resume: {first_resume}")
								await locator.select_option(value=first_resume['value'])
								yield "resume_selected"
								return
					except Exception as e:
						print(f"Error with selector {selector} after method change: {e}")
						continue
			except Exception as e:
				print(f"Error clicking resume method change: {e}")
				yield "resume_method_change_failed"
				return
		
		# If we get here, no resume selection was possible
		print("No resume selection possible - yielding no_resume_available")
		yield "no_resume_available"
			
	except Exception as e:
		print(f"Resume selection error: {e}")
		yield "resume_selection_error"


# Handle Cover Letter
async def handle_cover_letter(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Handle cover letter section in Quick Apply flow."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		from ..botfiles.workflows.seek.quick_apply_utils import get_default_cover_letter
		
		# Check for cover letter radio button
		radio_button = page.locator('input[data-testid="coverLetter-method-change"]')
		if await radio_button.count() > 0:
			# Click the radio button to enable cover letter
			await radio_button.click()
			await asyncio.sleep(1)
			
			# Fill the cover letter textarea
			textarea = page.locator('textarea[data-testid="coverLetterTextInput"]')
			if await textarea.count() > 0:
				# Try to get cover letter from config, fallback to default
				base_dir = ctx.get("base_dir") or str(Path(__file__).resolve().parents[2])
				settings = load_settings(base_dir, "seek")
				app_settings = settings.get("application_settings", {}) if isinstance(settings, dict) else {}
				cover_letter_text = app_settings.get("cover_letter_template", "") or get_default_cover_letter()
				
				await textarea.fill(cover_letter_text)
				yield "cover_letter_filled"
			else:
				yield "cover_letter_textarea_not_found"
		else:
			# No cover letter section, proceed
			yield "cover_letter_not_required"
			
	except Exception as e:
		print(f"Cover letter error: {e}")
		yield "cover_letter_error"


# Click Continue Button
async def click_continue_button(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Click the continue button to proceed to next step."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		# Look for continue button
		continue_btn = page.locator('button[data-testid="continue-button"]')
		if await continue_btn.count() > 0:
			await continue_btn.click()
			await asyncio.sleep(0.1)
			yield "continue_clicked"
		else:
			# Try alternative selectors
			alt_continue = page.locator('button:has-text("Continue"), button:has-text("Next")')
			if await alt_continue.count() > 0:
				await alt_continue.first.click()
				await asyncio.sleep(0.1)
				yield "continue_clicked"
			else:
				yield "continue_button_not_found"
				
	except Exception as e:
		print(f"Continue button error: {e}")
		yield "continue_button_error"


# Get Current Step
async def get_current_step(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Yield the mapped workflow step name for the current progress bar step."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	try:
		progress_script = """
		() => {
			const nav = document.querySelector('nav[aria-label="Progress bar"]');
			if (!nav) return "progress_bar_not_found";
			const quickApplyCurrentStep = nav.querySelector('li button[aria-current="step"]');
			if (!quickApplyCurrentStep) return "progress_bar_not_found";
			const stepText = quickApplyCurrentStep.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
			return stepText;
		}
		"""
		quick_apply_current_step_text = await page.evaluate(progress_script)
		if quick_apply_current_step_text == "progress_bar_not_found":
			yield "progress_bar_not_found"
		elif quick_apply_current_step_text:
			ctx["quick_apply_current_step_text"] = quick_apply_current_step_text
			if quick_apply_current_step_text == "Choose documents":
				yield "current_step_choose_documents"
			elif quick_apply_current_step_text == "Answer employer questions":
				yield "current_step_employer_questions"
			elif quick_apply_current_step_text == "Update SEEK Profile":
				yield "current_step_update_profile"
			elif quick_apply_current_step_text == "Review and submit":
				yield "current_step_review_submit"
			else:
				yield "current_step_unknown"
		else:
			yield "progress_bar_not_found"
	except Exception as e:
		yield "progress_bar_evaluation_error"


# Handle Employer Questions Answer 
async def handle_answer_employer_questions(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Handle the 'Answer employer questions' step with detection and parsing."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return

	print("Starting employer questions detection...")
	try:
		script_path = Path(__file__).resolve().parent / "scripts" / "quick_apply_questions.js"
		js_code = script_path.read_text(encoding="utf-8")
	except Exception as e:
		print(f"Error reading quick_apply_questions.js: {e}")
		yield "employer_questions_script_error"
		return

	try:
		# Get the form element using selector 'form'
		form = await page.query_selector('form')
		if not form:
			print("Form element not found on page.")
			yield "form_not_found"
			return
		# Pass the form element to JS
		result = await page.evaluate("(form) => {" + js_code + "}", form)
		if result and isinstance(result, dict):
			# print("Employer questions JS returned a result.")
			# print(result)
			
			# Print debug information if available
			# if 'debug' in result:
			# 	print("=== DEBUG INFORMATION ===")
			# 	for debug_msg in result['debug']:
			# 		print(f"DEBUG: {debug_msg}")
			# 	print("=== END DEBUG ===")
			
			# Print the actual results
			if 'results' in result:
				print(f"Found {len(result['results'])} question(s)")
				for i, qa in enumerate(result['results']):
					print(f"Question {i+1}: {qa.get('question', 'N/A')}")
					print(f"Answers: {qa.get('answers', [])}")
				yield "employer_questions_handled"
				return
		else:
			print("No employer questions detected or invalid result.")
			yield "employer_questions_none"
	except Exception as e:
		print(f"Error evaluating employer questions JS: {e}")
		yield "employer_questions_eval_error"
			

# Handle Update Seek Profile
async def handle_update_seek_profile(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Handle the 'Update SEEK Profile' step by looking for dashboard and showing banner."""
	context = ctx.get("browser_context")
	if not context:
		yield "no_browser_context"
		return
	
	try:
		# Look for existing dashboard page
		dashboard_page = None
		for p in context.pages:
			if "seek.com.au" in (p.url or "") and ("dashboard" in (p.url or "") or "profile" in (p.url or "")):
				dashboard_page = p
				break
		
		# If no dashboard found, try to find any seek.com.au page
		if not dashboard_page:
			for p in context.pages:
				if "seek.com.au" in (p.url or ""):
					dashboard_page = p
					break
		
		if dashboard_page:
			try:
				await dashboard_page.bring_to_front()
				print("Found existing SEEK page, brought to front")
			except Exception as e:
				print(f"Error bringing dashboard to front: {e}")
		
		# Show banner message
		ui_page = None
		try:
			for p in context.pages:
				if "127.0.0.1:6666" in (p.url or ""):
					ui_page = p
					break
		except Exception:
			pass
		
		if ui_page is None:
			ui_page = await context.new_page()
			try:
				await ui_page.goto("http://127.0.0.1:6666/")
			except Exception:
				pass
		
		try:
			await ui_page.bring_to_front()
		except Exception:
			pass
		
		try:
			await ui_page.evaluate("""
			(() => {
				const id = 'guu-update-profile-banner';
				if (document.getElementById(id)) return;
				const div = document.createElement('div');
				div.id = id;
				div.textContent = 'Please update your SEEK profile on seek.com.au, then resume the bot.';
				Object.assign(div.style, { position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', background: '#059669', color: '#fff', padding: '10px 14px', borderRadius: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.4)', zIndex: 2147483647 });
				document.body.appendChild(div);
				setTimeout(() => { try { div.remove(); } catch(e) {} }, 15000);
			})();
			""")
		except Exception:
			pass
		
		print("Update SEEK Profile step detected - showing banner")
		yield "update_profile_banner_shown"
		
	except Exception as e:
		print(f"Update SEEK Profile error: {e}")
		yield "update_profile_error"


# Back Button Quickapply
async def back_button_quickapply(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Click the back button in Quick Apply to go to previous step."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		# Look for back button
		back_btn = page.locator('button[data-testid="back-button"]')
		if await back_btn.count() > 0:
			await back_btn.click()
			await asyncio.sleep(2)
			print("Back button clicked successfully")
			yield "back_button_clicked"
		else:
			print("Back button not found")
			yield "back_button_not_found"
			
	except Exception as e:
		print(f"Back button error: {e}")
		yield "back_button_error"


# Submit Application
async def submit_application(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Submit the Quick Apply application."""
	page = ctx.get("quick_apply_page")
	if not page:
		yield "no_quick_apply_page"
		return
	
	try:
		from ..botfiles.workflows.seek.quick_apply_utils import is_application_complete, log_quick_apply_progress
		
		await log_quick_apply_progress(page, "SUBMIT")
		
		# Look for submit/apply button
		submit_btn = page.locator('button[data-testid="submit-button"], button:has-text("Submit"), button:has-text("Apply")')
		if await submit_btn.count() > 0:
			await submit_btn.first.click()
			await asyncio.sleep(3)
			
			# Check if application was successfully submitted
			if await is_application_complete(page):
				yield "application_submitted"
			else:
				# Wait a bit more and check again
				await asyncio.sleep(2)
				if await is_application_complete(page):
					yield "application_submitted"
				else:
					yield "application_submitted"  # Proceed anyway
		else:
			yield "submit_button_not_found"
			
	except Exception as e:
		print(f"Submit application error: {e}")
		yield "submit_application_error"


# Close Apply (Quick or Regular) And Continue Search
async def close_quick_apply_and_continue_search(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Close Quick Apply or Regular Apply tab, return to job search, and click next job card."""
	apply_page = ctx.get("quick_apply_page") or ctx.get("regular_apply_page")
	original_page = ctx.get("original_job_search_page")
	
	if not original_page:
		yield "no_original_page"
		return
	
	try:
		# Close whichever Apply tab is open
		if apply_page:
			await apply_page.close()
		
		# Switch back to the original job search page
		ctx["page"] = original_page
		await original_page.bring_to_front()
		
		# Clean up context
		ctx.pop("quick_apply_page", None)
		ctx.pop("regular_apply_page", None)
		ctx.pop("original_job_search_page", None)
		
		# Click the next job card
		yield "hunting_next_job"
		
	except Exception as e:
		print(f"Close and continue error: {e}")
		yield "close_and_continue_error"


# Finish Run
async def finish_run(ctx: Dict[str, Any]) -> AsyncGenerator[str, None]:
	"""Finish the run by closing browser context and cleaning up resources."""
	# print("=== FINAL CTX DUMP ===")
	# print(ctx)
	yield "run_finished"


