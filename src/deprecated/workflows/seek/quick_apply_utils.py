"""Utility functions for Quick Apply functionality in Playwright-based workflow."""
from typing import Dict, Any, List, Optional
import asyncio


async def check_progress_bar(page) -> Optional[Dict[str, Any]]:
    """Check the progress bar navigation to see current step and available steps."""
    try:
        progress_script = """
        const nav = document.querySelector('nav[aria-label="Progress bar"]');
        if (!nav) return null;
        
        const steps = Array.from(nav.querySelectorAll('li button')).map((button, index) => {
            const stepText = button.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
            const isCurrent = button.getAttribute('aria-current') === 'step';
            const isClickable = button.tabIndex >= 0;
            
            return {
                index: index + 1,
                text: stepText,
                isCurrent: isCurrent,
                isClickable: isClickable,
                tabIndex: button.tabIndex
            };
        });
        
        const progressBar = nav.querySelector('[role="progressbar"]');
        const currentProgress = progressBar ? {
            valueNow: progressBar.getAttribute('aria-valuenow'),
            valueMax: progressBar.getAttribute('aria-valuemax'),
            valueText: progressBar.getAttribute('aria-valuetext')
        } : null;
        
        return {
            steps: steps,
            progress: currentProgress,
            totalSteps: steps.length
        };
        """
        
        progress_info = await page.evaluate(progress_script)
        return progress_info
        
    except Exception:
        return None


async def get_available_resume_options(page) -> List[Dict[str, str]]:
    """Get available resume options from the dropdown."""
    try:
        resume_script = """
        const select = document.querySelector('select[data-testid="select-input"]');
        if (!select) return [];
        
        return Array.from(select.options).map(option => ({
            value: option.value,
            text: option.textContent.trim(),
            selected: option.selected
        })).filter(opt => opt.value && opt.value !== '');
        """
        
        options = await page.evaluate(resume_script)
        return options or []
        
    except Exception:
        return []


async def scan_employer_questions(page) -> Dict[str, Any]:
    """Scan for employer questions on the page."""
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
        return result or {"questionsFound": 0, "questions": []}
        
    except Exception:
        return {"questionsFound": 0, "questions": []}


async def get_current_step_text(page) -> Optional[str]:
    """Get the current step text from the progress bar."""
    try:
        progress_script = """
        const nav = document.querySelector('nav[aria-label="Progress bar"]');
        if (!nav) return null;
        
        const currentStep = nav.querySelector('li button[aria-current="step"]');
        if (!currentStep) return null;
        
        const stepText = currentStep.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
        return stepText;
        """
        
        step_text = await page.evaluate(progress_script)
        return step_text
        
    except Exception:
        return None


def get_default_cover_letter() -> str:
    """Get the default cover letter template."""
    return """Dear Hiring Manager,

    I am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.

    I am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.

    Thank you for your consideration.

    Best regards"""


async def log_quick_apply_progress(page, step_name: str) -> None:
    """Log the current progress in the Quick Apply flow."""
    try:
        progress_info = await check_progress_bar(page)
        if progress_info:
            current_step = next((step for step in progress_info["steps"] if step["isCurrent"]), None)
            if current_step:
                print(f"[{step_name}] Currently on: {current_step['text']} ({current_step['index']}/{progress_info['totalSteps']})")
            else:
                print(f"[{step_name}] Progress: {progress_info['totalSteps']} total steps")
        else:
            print(f"[{step_name}] No progress bar found")
    except Exception:
        print(f"[{step_name}] Could not determine progress")


async def is_application_complete(page) -> bool:
    """Check if the application has been successfully submitted."""
    try:
        # Look for success indicators
        success_indicators = [
            'text="Application submitted"',
            'text="Thank you"',
            'text="Your application has been sent"',
            '[data-testid="application-success"]'
        ]
        
        for indicator in success_indicators:
            if await page.locator(indicator).count() > 0:
                return True
        
        # Check URL for success patterns
        url = page.url
        if any(pattern in url.lower() for pattern in ['success', 'complete', 'submitted']):
            return True
            
        return False
        
    except Exception:
        return False