from playwright.sync_api import sync_playwright
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

def get_current_page_info(cdp_endpoint: str = "http://127.0.0.1:9222"):
    """Get information about the current page in the browser."""
    try:
        with sync_playwright() as p:
            # Connect to the existing browser via CDP
            browser = p.chromium.connect_over_cdp(cdp_endpoint)
            # Use existing context instead of creating new one
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            
            # Get all pages in the context
            pages = context.pages
            print(f"Found {len(pages)} page(s) in the browser context.")
            
            for i, page in enumerate(pages):
                try:
                    url = page.url
                    title = page.title()
                    print(f"Page {i+1}: {title} - {url}")
                except Exception as e:
                    print(f"Page {i+1}: Error getting info - {e}")
            
            # Don't close the browser, just return
            return pages
            
    except Exception as e:
        print(f"Error connecting to browser: {e}")
        print("Make sure main.py is running and the browser server is active.")
        return []

def parse_forms_on_current_page(cdp_endpoint: str = "http://127.0.0.1:9222"):
    """Parse forms on the current active page."""
    try:
        with sync_playwright() as p:
            # Connect to the existing browser via CDP
            browser = p.chromium.connect_over_cdp(cdp_endpoint)
            # Use existing context instead of creating new one
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            
            # Get the active page
            pages = context.pages
            if not pages:
                print("No pages found in the browser context.")
                return []
            
            # Use the first page (or you could use the active one)
            page = pages[0]
            url = page.url
            title = page.title()
            
            print(f"Parsing forms on current page: {title} - {url}")

            forms_data = []

            forms = page.query_selector_all("form")
            print(f"Found {len(forms)} form(s) on the page.")

            for idx, form in enumerate(forms):
                form_info = {
                    "form_index": idx, 
                    "form_id": form.get_attribute("id"),
                    "form_class": form.get_attribute("class"),
                    "form_action": form.get_attribute("action"),
                    "form_method": form.get_attribute("method"),
                    "fields": []
                }

                # Get all form elements
                form_elements = form.query_selector_all("input, textarea, select, button, label")
                
                # Group labels with their associated inputs
                labels = {}
                for element in form_elements:
                    if element.evaluate("el => el.tagName.toLowerCase()") == "label":
                        for_attr = element.get_attribute("for")
                        if for_attr:
                            labels[for_attr] = element.inner_text().strip()
                        else:
                            # Check if label contains an input
                            input_inside = element.query_selector("input, textarea, select")
                            if input_inside:
                                input_id = input_inside.get_attribute("id")
                                if input_id:
                                    labels[input_id] = element.inner_text().strip()

                for element in form_elements:
                    tag = element.evaluate("el => el.tagName.toLowerCase()")
                    
                    # Skip labels as we handle them separately
                    if tag == "label":
                        continue
                    
                    element_id = element.get_attribute("id")
                    element_name = element.get_attribute("name")
                    element_type = element.get_attribute("type") if tag == "input" else tag
                    element_placeholder = element.get_attribute("placeholder")
                    element_value = element.get_attribute("value")
                    element_required = element.get_attribute("required") is not None
                    element_disabled = element.get_attribute("disabled") is not None
                    element_class = element.get_attribute("class")
                    
                    # Get associated label
                    associated_label = None
                    if element_id and element_id in labels:
                        associated_label = labels[element_id]
                    elif element_name and element_name in labels:
                        associated_label = labels[element_name]
                    
                    # Handle different element types
                    options = []
                    if tag == "select":
                        opts = element.query_selector_all("option")
                        options = []
                        for opt in opts:
                            opt_value = opt.get_attribute("value")
                            opt_text = opt.inner_text().strip()
                            opt_selected = opt.get_attribute("selected") is not None
                            options.append({
                                "value": opt_value,
                                "text": opt_text,
                                "selected": opt_selected
                            })
                    
                    elif element_type in ["radio", "checkbox"]:
                        # Get all radio/checkbox elements with the same name
                        if element_name:
                            same_name_elements = form.query_selector_all(f"input[name='{element_name}']")
                            options = []
                            for same_element in same_name_elements:
                                same_value = same_element.get_attribute("value")
                                same_checked = same_element.get_attribute("checked") is not None
                                options.append({
                                    "value": same_value,
                                    "checked": same_checked
                                })
                        else:
                            options = [{"value": element_value, "checked": element.get_attribute("checked") is not None}]
                    
                    elif element_type == "button":
                        options = [{"text": element.inner_text().strip(), "type": element.get_attribute("type")}]

                    field_info = {
                        "tag": tag,
                        "type": element_type,
                        "id": element_id,
                        "name": element_name,
                        "placeholder": element_placeholder,
                        "value": element_value,
                        "required": element_required,
                        "disabled": element_disabled,
                        "class": element_class,
                        "label": associated_label,
                        "options": options
                    }

                    form_info["fields"].append(field_info)

                forms_data.append(form_info)

            # Don't close the browser, just return
            return forms_data
            
    except Exception as e:
        print(f"Error connecting to browser: {e}")
        print("Make sure main.py is running and the browser server is active.")
        return []

def parse_forms(url: str, cdp_endpoint: str = "http://127.0.0.1:9222"):
    """Parse forms on a given URL using the existing browser session."""
    try:
        with sync_playwright() as p:
            # Connect to the existing browser via CDP
            browser = p.chromium.connect_over_cdp(cdp_endpoint)
            # Use existing context instead of creating new one
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            page = context.new_page()
            page.goto(url)

            forms_data = []

            forms = page.query_selector_all("form")
            print(f"Found {len(forms)} form(s) on the page.")

            for idx, form in enumerate(forms):
                form_info = {
                    "form_index": idx, 
                    "form_id": form.get_attribute("id"),
                    "form_class": form.get_attribute("class"),
                    "form_action": form.get_attribute("action"),
                    "form_method": form.get_attribute("method"),
                    "fields": []
                }

                # Get all form elements
                form_elements = form.query_selector_all("input, textarea, select, button, label")
                
                # Group labels with their associated inputs
                labels = {}
                for element in form_elements:
                    if element.evaluate("el => el.tagName.toLowerCase()") == "label":
                        for_attr = element.get_attribute("for")
                        if for_attr:
                            labels[for_attr] = element.inner_text().strip()
                        else:
                            # Check if label contains an input
                            input_inside = element.query_selector("input, textarea, select")
                            if input_inside:
                                input_id = input_inside.get_attribute("id")
                                if input_id:
                                    labels[input_id] = element.inner_text().strip()

                for element in form_elements:
                    tag = element.evaluate("el => el.tagName.toLowerCase()")
                    
                    # Skip labels as we handle them separately
                    if tag == "label":
                        continue
                    
                    element_id = element.get_attribute("id")
                    element_name = element.get_attribute("name")
                    element_type = element.get_attribute("type") if tag == "input" else tag
                    element_placeholder = element.get_attribute("placeholder")
                    element_value = element.get_attribute("value")
                    element_required = element.get_attribute("required") is not None
                    element_disabled = element.get_attribute("disabled") is not None
                    element_class = element.get_attribute("class")
                    
                    # Get associated label
                    associated_label = None
                    if element_id and element_id in labels:
                        associated_label = labels[element_id]
                    elif element_name and element_name in labels:
                        associated_label = labels[element_name]
                    
                    # Handle different element types
                    options = []
                    if tag == "select":
                        opts = element.query_selector_all("option")
                        options = []
                        for opt in opts:
                            opt_value = opt.get_attribute("value")
                            opt_text = opt.inner_text().strip()
                            opt_selected = opt.get_attribute("selected") is not None
                            options.append({
                                "value": opt_value,
                                "text": opt_text,
                                "selected": opt_selected
                            })
                    
                    elif element_type in ["radio", "checkbox"]:
                        # Get all radio/checkbox elements with the same name
                        if element_name:
                            same_name_elements = form.query_selector_all(f"input[name='{element_name}']")
                            options = []
                            for same_element in same_name_elements:
                                same_value = same_element.get_attribute("value")
                                same_checked = same_element.get_attribute("checked") is not None
                                options.append({
                                    "value": same_value,
                                    "checked": same_checked
                                })
                        else:
                            options = [{"value": element_value, "checked": element.get_attribute("checked") is not None}]
                    
                    elif element_type == "button":
                        options = [{"text": element.inner_text().strip(), "type": element.get_attribute("type")}]

                    field_info = {
                        "tag": tag,
                        "type": element_type,
                        "id": element_id,
                        "name": element_name,
                        "placeholder": element_placeholder,
                        "value": element_value,
                        "required": element_required,
                        "disabled": element_disabled,
                        "class": element_class,
                        "label": associated_label,
                        "options": options
                    }

                    form_info["fields"].append(field_info)

                forms_data.append(form_info)

            # Don't close the page - stay on the tab for further interaction
            print(f"Page remains open at: {page.url}")
            return forms_data
            
    except Exception as e:
        print(f"Error connecting to browser: {e}")
        print("Make sure main.py is running and the browser server is active.")
        return []


def parse_employer_questions(url: str, cdp_endpoint: str = "http://127.0.0.1:9222"):
    """Parse employer questions forms specifically for job application pages."""
    try:
        with sync_playwright() as p:
            # Connect to the existing browser via CDP
            browser = p.chromium.connect_over_cdp(cdp_endpoint)
            # Use existing context instead of creating new one
            context = browser.contexts[0] if browser.contexts else browser.new_context()
            page = context.new_page()
            page.goto(url)

            print(f"Parsing employer questions on: {url}")
            
            # Look for forms and also check for question containers that might not be in forms
            forms = page.query_selector_all("form")
            question_containers = page.query_selector_all("[data-testid*='question'], [class*='question'], [id*='question']")
            
            print(f"Found {len(forms)} form(s) and {len(question_containers)} question container(s) on the page.")

            all_questions = []

            # Parse forms
            for idx, form in enumerate(forms):
                form_info = {
                    "type": "form",
                    "form_index": idx, 
                    "form_id": form.get_attribute("id"),
                    "form_class": form.get_attribute("class"),
                    "form_action": form.get_attribute("action"),
                    "form_method": form.get_attribute("method"),
                    "questions": []
                }

                # Get all form elements
                form_elements = form.query_selector_all("input, textarea, select, button, label, div[class*='question'], div[data-testid*='question']")
                
                # Group labels with their associated inputs
                labels = {}
                for element in form_elements:
                    if element.evaluate("el => el.tagName.toLowerCase()") == "label":
                        for_attr = element.get_attribute("for")
                        if for_attr:
                            labels[for_attr] = element.inner_text().strip()
                        else:
                            # Check if label contains an input
                            input_inside = element.query_selector("input, textarea, select")
                            if input_inside:
                                input_id = input_inside.get_attribute("id")
                                if input_id:
                                    labels[input_id] = element.inner_text().strip()

                for element in form_elements:
                    tag = element.evaluate("el => el.tagName.toLowerCase()")
                    
                    # Skip labels as we handle them separately
                    if tag == "label":
                        continue
                    
                    element_id = element.get_attribute("id")
                    element_name = element.get_attribute("name")
                    element_type = element.get_attribute("type") if tag == "input" else tag
                    element_placeholder = element.get_attribute("placeholder")
                    element_value = element.get_attribute("value")
                    element_required = element.get_attribute("required") is not None
                    element_disabled = element.get_attribute("disabled") is not None
                    element_class = element.get_attribute("class")
                    element_data_testid = element.get_attribute("data-testid")
                    
                    # Get associated label
                    associated_label = None
                    if element_id and element_id in labels:
                        associated_label = labels[element_id]
                    elif element_name and element_name in labels:
                        associated_label = labels[element_name]
                    
                    # Handle different element types
                    options = []
                    if tag == "select":
                        opts = element.query_selector_all("option")
                        options = []
                        for opt in opts:
                            opt_value = opt.get_attribute("value")
                            opt_text = opt.inner_text().strip()
                            opt_selected = opt.get_attribute("selected") is not None
                            options.append({
                                "value": opt_value,
                                "text": opt_text,
                                "selected": opt_selected
                            })
                    
                    elif element_type in ["radio", "checkbox"]:
                        # Get all radio/checkbox elements with the same name
                        if element_name:
                            same_name_elements = form.query_selector_all(f"input[name='{element_name}']")
                            options = []
                            for same_element in same_name_elements:
                                same_value = same_element.get_attribute("value")
                                same_checked = same_element.get_attribute("checked") is not None
                                options.append({
                                    "value": same_value,
                                    "checked": same_checked
                                })
                        else:
                            options = [{"value": element_value, "checked": element.get_attribute("checked") is not None}]
                    
                    elif element_type == "button":
                        options = [{"text": element.inner_text().strip(), "type": element.get_attribute("type")}]

                    question_info = {
                        "tag": tag,
                        "type": element_type,
                        "id": element_id,
                        "name": element_name,
                        "placeholder": element_placeholder,
                        "value": element_value,
                        "required": element_required,
                        "disabled": element_disabled,
                        "class": element_class,
                        "data_testid": element_data_testid,
                        "label": associated_label,
                        "options": options
                    }

                    form_info["questions"].append(question_info)

                all_questions.append(form_info)

            # Parse question containers
            for idx, container in enumerate(question_containers):
                container_info = {
                    "type": "question_container",
                    "container_index": idx,
                    "container_id": container.get_attribute("id"),
                    "container_class": container.get_attribute("class"),
                    "container_data_testid": container.get_attribute("data-testid"),
                    "questions": []
                }

                # Look for form elements within the container
                container_elements = container.query_selector_all("input, textarea, select, button, label")
                
                # Group labels with their associated inputs
                labels = {}
                for element in container_elements:
                    if element.evaluate("el => el.tagName.toLowerCase()") == "label":
                        for_attr = element.get_attribute("for")
                        if for_attr:
                            labels[for_attr] = element.inner_text().strip()
                        else:
                            # Check if label contains an input
                            input_inside = element.query_selector("input, textarea, select")
                            if input_inside:
                                input_id = input_inside.get_attribute("id")
                                if input_id:
                                    labels[input_id] = element.inner_text().strip()

                for element in container_elements:
                    tag = element.evaluate("el => el.tagName.toLowerCase()")
                    
                    # Skip labels as we handle them separately
                    if tag == "label":
                        continue
                    
                    element_id = element.get_attribute("id")
                    element_name = element.get_attribute("name")
                    element_type = element.get_attribute("type") if tag == "input" else tag
                    element_placeholder = element.get_attribute("placeholder")
                    element_value = element.get_attribute("value")
                    element_required = element.get_attribute("required") is not None
                    element_disabled = element.get_attribute("disabled") is not None
                    element_class = element.get_attribute("class")
                    element_data_testid = element.get_attribute("data-testid")
                    
                    # Get associated label
                    associated_label = None
                    if element_id and element_id in labels:
                        associated_label = labels[element_id]
                    elif element_name and element_name in labels:
                        associated_label = labels[element_name]
                    
                    # Handle different element types
                    options = []
                    if tag == "select":
                        opts = element.query_selector_all("option")
                        options = []
                        for opt in opts:
                            opt_value = opt.get_attribute("value")
                            opt_text = opt.inner_text().strip()
                            opt_selected = opt.get_attribute("selected") is not None
                            options.append({
                                "value": opt_value,
                                "text": opt_text,
                                "selected": opt_selected
                            })
                    
                    elif element_type in ["radio", "checkbox"]:
                        # Get all radio/checkbox elements with the same name
                        if element_name:
                            same_name_elements = container.query_selector_all(f"input[name='{element_name}']")
                            options = []
                            for same_element in same_name_elements:
                                same_value = same_element.get_attribute("value")
                                same_checked = same_element.get_attribute("checked") is not None
                                options.append({
                                    "value": same_value,
                                    "checked": same_checked
                                })
                        else:
                            options = [{"value": element_value, "checked": element.get_attribute("checked") is not None}]
                    
                    elif element_type == "button":
                        options = [{"text": element.inner_text().strip(), "type": element.get_attribute("type")}]

                    question_info = {
                        "tag": tag,
                        "type": element_type,
                        "id": element_id,
                        "name": element_name,
                        "placeholder": element_placeholder,
                        "value": element_value,
                        "required": element_required,
                        "disabled": element_disabled,
                        "class": element_class,
                        "data_testid": element_data_testid,
                        "label": associated_label,
                        "options": options
                    }

                    container_info["questions"].append(question_info)

                all_questions.append(container_info)

            # Don't close the page - stay on the tab for further interaction
            print(f"Page remains open at: {page.url}")
            return all_questions
            
    except Exception as e:
        print(f"Error connecting to browser: {e}")
        print("Make sure main.py is running and the browser server is active.")
        return []


if __name__ == "__main__":
    print("=== Checking current browser pages ===")
    get_current_page_info()
    
    print("\n=== Testing form parser on current page ===")
    forms = parse_forms_on_current_page()
    from pprint import pprint
    pprint(forms)
    
    print("\n=== Testing with specific URL ===")
    url = "https://www.seek.com.au/job/86578589/apply/role-requirements"  # paste your target URL here
    forms = parse_forms(url)
    pprint(forms)
