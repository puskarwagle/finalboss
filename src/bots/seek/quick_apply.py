"""Application flow logic for Quick Apply functionality."""
import time
import os
from utils.logging import logger
from seek.selectors import SELECTORS
import core.play_wrapper as play


class QuickApplyHandler:
    """Handles Quick Apply application flow logic."""
    
    def __init__(self, driver, wait, config=None):
        self.driver = driver
        self.wait = wait
        self.config = config or {}
        self.scripts_path = os.path.join(os.path.dirname(__file__), 'scripts')
    
    def _load_script(self, script_name):
        """Load JavaScript from external file."""
        script_path = os.path.join(self.scripts_path, script_name)
        try:
            with open(script_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"❌ Script not found: {script_path}")
            return None
    
    def detect_quick_apply_button(self):
        """Scan job details area for 'Quick apply' button specifically (not just 'Apply')."""
        try:
            logger.info("🔍 Checking for Quick apply button...")
            
            # Load and execute detection script
            detection_script = self._load_script('quick_apply_detector.js')
            if not detection_script:
                return False
            
            detection_script += "\nreturn detectQuickApply();"
            result = play.evaluate(self.driver, detection_script)
            
            if result["hasQuickApply"]:
                logger.info(f"✅ Quick apply button found! Count: {result['quickApplyCount']}")
                return True
            elif result["hasRegularApply"]:
                logger.info("❌ Only regular Apply button found, skipping job")
                return False
            else:
                logger.warning("⚠️ No Apply buttons found at all")
                return False
                
        except Exception as e:
            logger.error(f"❌ Quick apply detection failed: {e}")
            return False
    
    def click_and_switch_tab(self):
        """Click Quick apply button and switch to the new tab that opens."""
        try:
            logger.info("🎯 Clicking Quick apply button...")
            
            # Store current tab count
            initial_tab_count = len(play.get_window_handles(self.driver))
            logger.info(f"Initial tabs: {initial_tab_count}")
            
            # Load and execute click script
            click_script = self._load_script('quick_apply_detector.js')
            if not click_script:
                return False
            
            click_script += "\nreturn clickQuickApplyButton();"
            click_success = play.evaluate(self.driver, click_script)
            
            if not click_success:
                logger.error("❌ Quick apply button not found or not clickable")
                return False
            
            # Wait for new tab to open (max 5 seconds)
            logger.info("⏳ Waiting for new tab to open...")
            for attempt in range(50):  # 50 * 0.1 = 5 seconds max
                current_tab_count = len(play.get_window_handles(self.driver))
                if current_tab_count > initial_tab_count:
                    logger.info(f"✅ New tab opened! Total tabs: {current_tab_count}")
                    break
                time.sleep(0.1)
            else:
                logger.warning("⚠️ No new tab detected after 5 seconds")
                return False
            
            # Switch to the new tab (last one)
            new_tab = play.get_window_handles(self.driver)[-1]
            self.driver = play.switch_to_window(self.driver, new_tab)
            logger.info("✅ Switched to Quick apply tab")
            
            # Wait a bit for page to load
            time.sleep(1)
            logger.info(f"📍 Current URL: {play.current_url(self.driver)}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Quick apply click and switch failed: {e}")
            return False
    
    def select_resume(self):
        """Find and select the first available resume from the dropdown."""
        try:
            logger.info(" Looking for resume dropdown...")
            
            # Load resume selector script
            resume_script = self._load_script('resume_selector.js')
            if not resume_script:
                return False
            
            # Wait for the select dropdown to be present
            play.wait_for_present(self.driver, SELECTORS['quick_apply']['resume_select'])
            
            # Get available options using JavaScript
            resume_script += "\nreturn getAvailableResumes();"
            available_options = play.evaluate(self.driver, resume_script)
            
            if not available_options or len(available_options) == 0:
                logger.error("❌ No resume options available in dropdown")
                return False
            
            logger.info(f"✅ Found {len(available_options)} resume(s)")
            for i, option in enumerate(available_options):
                logger.info(f"  {i+1}. {option['text']} (value: {option['value'][:8]}...)")
            
            # Select the first available resume
            first_resume = available_options[0]
            play.select_option_by_value(self.driver, SELECTORS['quick_apply']['resume_select'], first_resume['value'])
            
            logger.info(f"✅ Selected resume: {first_resume['text']}")
            
            # Brief pause to let the selection register
            time.sleep(0.5)
            
            return True
            
        except play.TimeoutError:
            logger.error("❌ Resume dropdown not found")
            return False
        except Exception as e:
            logger.error(f"❌ Resume selection failed: {e}")
            return False
    
    def handle_cover_letter(self):
        """Click cover letter radio button, fill textarea, and click continue."""
        try:
            logger.info("📝 Handling cover letter section...")
            
            # Click the radio button using JavaScript (default strategy)
            logger.info("🎯 Clicking cover letter change option...")
            
            if not self._click_radio_button():
                logger.error("❌ Failed to click radio button")
                return False
            
            logger.info("✅ Radio button successfully clicked")
            
            # Brief pause for textarea to appear
            time.sleep(1)
            
            # Step 2: Wait for and fill the textarea
            logger.info("📄 Filling cover letter textarea...")
            cover_selector = SELECTORS['quick_apply']['cover_letter_textarea']
            
            # Get cover letter template from config
            app_settings = self.config.get('application_settings', {})
            cover_letter_template = app_settings.get('cover_letter_template', '')
            
            # Default cover letter if none provided
            if not cover_letter_template:
                cover_letter_template = """Dear Hiring Manager,

            I am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.

            I am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.

            Thank you for your consideration.

            Best regards,
            [Your Name]"""
            
            # Fill the textarea
            play.fill(self.driver, cover_selector, cover_letter_template)
            logger.info("✅ Cover letter filled from config template")
            
            # Step 3: Click continue button
            logger.info("🚀 Clicking continue button...")
            continue_button = play.wait_for_clickable(self.driver, 'button[data-testid="continue-button"]')
            continue_button.click()
            logger.info("✅ Continue button clicked")
            
            # Brief pause to let the next step load
            time.sleep(2)
            
            # Check progress bar to see current step
            self.check_progress_bar()
            
            return True
            
        except play.TimeoutError as e:
            logger.error(f"❌ Timeout waiting for cover letter elements: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Cover letter handling failed: {e}")
            return False

    def _click_radio_button(self):
        """Click the radio button using JavaScript strategy."""
        try:
            logger.info("🔄 Using JavaScript click strategy...")
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
            
            success = play.evaluate(self.driver, click_script)
            if success:
                logger.info("✅ JavaScript click successful")
            else:
                logger.error("❌ JavaScript click failed - radio button not found")
            return success
            
        except Exception as e:
            logger.error(f"❌ JavaScript click failed: {e}")
            return False

    def check_progress_bar(self):
        """Check the progress bar navigation to see current step and available steps."""
        try:
            logger.info("🔍 Checking progress bar navigation...")
            
            progress_script = """
            const nav = document.querySelector('nav[aria-label="Progress bar"]');
            if (!nav) return null;
            
            const steps = Array.from(nav.querySelectorAll('li button')).map((button, index) => {
                const stepText = button.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';                const isCurrent = button.getAttribute('aria-current') === 'step';
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
            
            progress_info = play.evaluate(self.driver, progress_script)
            
            if not progress_info:
                logger.warning("⚠️ Progress bar navigation not found")
                return False
            
            logger.info(f"📊 Progress Bar Analysis:")
            logger.info(f"   Total Steps: {progress_info['totalSteps']}")
            
            if progress_info['progress']:
                logger.info(f"   Current Progress: {progress_info['progress']['valueNow']}/{progress_info['progress']['valueMax']}")
            
            logger.info("   Steps:")
            for step in progress_info['steps']:
                status = "🔵 CURRENT" if step['isCurrent'] else ("✅ COMPLETED" if step['isClickable'] else "⏳ PENDING")
                logger.info(f"     {step['index']}. {step['text']} - {status}")
            
            # Find current step
            current_step = next((step for step in progress_info['steps'] if step['isCurrent']), None)
            if current_step:
                logger.info(f"🎯 Currently on step: {current_step['index']} - {current_step['text']}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Progress bar check failed: {e}")
            return False
            
    def close_tab_and_return(self):
        """Close current application tab and return to main search results tab."""
        try:
            logger.info("🔄 Closing application tab and returning to search results...")
            
            # Close current tab
            remaining = play.close_current_tab(self.driver)
            
            # Switch back to main tab (first one)
            main_tab = play.get_window_handles(remaining or self.driver)[0]
            self.driver = play.switch_to_window(self.driver, main_tab)
            
            logger.info("✅ Returned to main search results tab")
            logger.info(f"📍 Back to: {play.current_url(self.driver)}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Tab closing and return failed: {e}")
            return False
    
    def is_on_employer_questions_step(self):
        """Check if current step is 'Answer employer questions'."""
        try:
            logger.info("🔍 Checking if on 'Answer employer questions' step...")
            
            progress_script = """
            const nav = document.querySelector('nav[aria-label="Progress bar"]');
            if (!nav) return null;
            
            const currentStep = nav.querySelector('li button[aria-current="step"]');
            if (!currentStep) return null;
            
            const stepText = currentStep.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
            
            return {
                isEmployerQuestions: stepText.toLowerCase().includes('answer employer questions'),
                currentStepText: stepText
            };
            """
            
            result = play.evaluate(self.driver, progress_script)
            
            if not result:
                logger.warning("⚠️ Could not determine current step")
                return False
            
            logger.info(f"📍 Current step: '{result['currentStepText']}'")
            
            if result['isEmployerQuestions']:
                logger.info("✅ On 'Answer employer questions' step")
                return True
            else:
                logger.info("❌ Not on 'Answer employer questions' step")
                return False
                
        except Exception as e:
            logger.error(f"❌ Step check failed: {e}")
            return False

    def handle_employer_questions(self):
        """Find and handle employer question forms with select dropdowns and radio inputs."""
        try:
            logger.info("📝 Scanning for employer questions form...")
            
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
                        
                        # Find the label text for this radio
                        let labelText = '';
                        const label = radioContainer.querySelector(`label[for="${radio.id}"]`);
                        if (label) {
                            labelText = label.textContent.trim();
                        } else {
                            # Try to find text near the radio
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
                    
                    # Add each radio group as a question (but avoid duplicates)
                    Object.entries(radioGroups).forEach(([name, options]) => {
                        # Check if we already have this radio group
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
            
            result = play.evaluate(self.driver, form_scan_script)
            
            if not result or result['questionsFound'] == 0:
                logger.warning("⚠️ No employer questions found")
                return False
            
            logger.info(f"✅ Found {result['questionsFound']} employer question(s):")
            
            for i, question in enumerate(result['questions'], 1):
                logger.info(f"  {i}. [{question['type'].upper()}] {question['question']}")
                logger.info(f"     Element: {question['element']}")
                logger.info(f"     Required: {question.get('required', False)}")
                
                if question['type'] == 'select':
                    logger.info(f"     Options ({len(question['options'])}):")
                    for opt in question['options']:
                        selected_mark = " ✓" if opt['selected'] else ""
                        logger.info(f"       - {opt['text']} (value: {opt['value']}){selected_mark}")
                
                elif question['type'] == 'radio':
                    logger.info(f"     Options ({len(question['options'])}):")
                    for opt in question['options']:
                        checked_mark = " ✓" if opt['checked'] else ""
                        logger.info(f"       - {opt['text']} (value: {opt['value']}){checked_mark}")
            
            # TODO: Implement automatic answering logic based on config
            logger.info("📝 Questions detected - automatic answering not implemented yet")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Employer questions handling failed: {e}")
            return False   
                
    def complete_application_flow(self):
        """Complete the initial application steps: resume selection + cover letter + progress check."""
        try:
            # Step 1: Select resume
            resume_selected = self.select_resume()
            if not resume_selected:
                logger.error("❌ Failed to select resume, aborting application")
                return False

            logger.info("🎯 Resume selected, proceeding with application...")

            # Step 2: Handle cover letter and click continue
            cover_letter_success = self.handle_cover_letter()
            if not cover_letter_success:
                logger.error("❌ Failed to handle cover letter, aborting application")
                return False

            # Check if we're on employer questions step
            if self.is_on_employer_questions_step():
                questions_handled = self.handle_employer_questions()
                if questions_handled:
                    logger.info("✅ Employer questions processed")
                else:
                    logger.warning("⚠️ Failed to process employer questions")
            else:
                logger.info("📍 Not on employer questions step - different flow detected")

            return True
            
        except Exception as e:
            logger.error(f"❌ Application flow failed: {e}")
            return False


            