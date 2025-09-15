from bs4 import BeautifulSoup
from pathlib import Path
import json
from typing import Dict, List, Any, Optional

async def detect_forms_helper_python(page) -> Dict[str, Any]:
    """
    Python-based form detection using BeautifulSoup.
    Alternative to JavaScript form parsing.
    """
    try:
        # Get the HTML content from the page
        html_content = await page.content()
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find all forms
        forms = soup.find_all('form')
        
        form_data = []
        
        for form_index, form in enumerate(forms):
            form_info = parse_form_with_beautifulsoup(form, form_index)
            form_data.append(form_info)
        
        return {
            'timestamp': page.url,  # Use URL as timestamp for now
            'url': page.url,
            'formsFound': len(form_data),
            'forms': form_data,
            'parser': 'beautifulsoup-python'
        }
        
    except Exception as e:
        print(f"Error in Python form detection: {e}")
        return {"formsFound": 0, "forms": [], "error": str(e)}


def parse_form_with_beautifulsoup(form, form_index: int) -> Dict[str, Any]:
    """Parse a single form using BeautifulSoup"""
    
    # Basic form attributes
    form_info = {
        'formIndex': form_index,
        'formId': form.get('id'),
        'formName': form.get('name'),
        'formClass': form.get('class', []),
        'formAction': form.get('action', ''),
        'formMethod': (form.get('method', 'GET')).upper(),
        'formEnctype': form.get('enctype', 'application/x-www-form-urlencoded'),
        'formTarget': form.get('target'),
        'formNoValidate': form.has_attr('novalidate'),
        'formAutocomplete': form.get('autocomplete'),
        'fields': [],
        'fieldsets': []
    }
    
    # Build label mapping
    labels_map = build_label_mapping(form)
    
    # Find all form elements
    form_elements = form.find_all([
        'input', 'textarea', 'select', 'button', 
        'output', 'progress', 'meter'
    ])
    
    # Process each element
    for element_index, element in enumerate(form_elements):
        field_data = parse_form_element(element, element_index, labels_map)
        if field_data:
            form_info['fields'].append(field_data)
    
    # Process fieldsets
    fieldsets = form.find_all('fieldset')
    for fs_index, fieldset in enumerate(fieldsets):
        legend = fieldset.find('legend')
        form_info['fieldsets'].append({
            'index': fs_index,
            'disabled': fieldset.has_attr('disabled'),
            'name': fieldset.get('name'),
            'legend': legend.get_text(strip=True) if legend else None,
            'fieldCount': len(fieldset.find_all(['input', 'textarea', 'select', 'button']))
        })
    
    return form_info


def build_label_mapping(form) -> Dict[str, Dict[str, Any]]:
    """Build a mapping of element IDs to their labels"""
    labels_map = {}
    
    # Find all labels
    labels = form.find_all('label')
    
    for label in labels:
        label_text = label.get_text(strip=True)
        required = '*' in label_text or 'required' in label.get('class', [])
        
        # Handle explicit labels (for attribute)
        for_attr = label.get('for')
        if for_attr:
            labels_map[for_attr] = {
                'text': label_text,
                'required': required
            }
        else:
            # Handle implicit labels (nested inputs)
            nested_input = label.find(['input', 'textarea', 'select'])
            if nested_input and nested_input.get('id'):
                labels_map[nested_input.get('id')] = {
                    'text': label_text,
                    'required': required
                }
    
    return labels_map


def parse_form_element(element, element_index: int, labels_map: Dict) -> Optional[Dict[str, Any]]:
    """Parse a single form element"""
    
    tag_name = element.name.lower()
    element_id = element.get('id')
    element_name = element.get('name')
    element_type = get_element_type(element)
    
    # Skip labels as they're processed separately
    if tag_name == 'label':
        return None
    
    # Get label information
    label_info = get_label_info(element, labels_map)
    
    # Base field data
    field_data = {
        'index': element_index,
        'tag': tag_name,
        'type': element_type,
        'id': element_id,
        'name': element_name,
        'placeholder': element.get('placeholder'),
        'title': element.get('title'),
        'required': element.has_attr('required') or label_info.get('required', False),
        'disabled': element.has_attr('disabled'),
        'readonly': element.has_attr('readonly'),
        'hidden': is_element_hidden(element),
        'class': element.get('class', []),
        'data-testid': element.get('data-testid'),
        'data-type': element.get('data-type'),
        'tabindex': element.get('tabindex'),
        'label': label_info.get('text'),
        'value': get_element_value(element),
        'validation': get_validation_info(element),
        'accessibility': get_accessibility_info(element)
    }
    
    # Add type-specific data
    if element_type in ['select', 'select-one', 'select-multiple']:
        field_data['options'] = parse_select_options(element)
        field_data['multiple'] = element.has_attr('multiple')
        field_data['size'] = element.get('size')
        
    elif element_type in ['radio', 'checkbox']:
        field_data['checked'] = element.has_attr('checked')
        # Note: For radio/checkbox groups, you'd need access to the full form
        
    elif element_type == 'file':
        field_data['accept'] = element.get('accept')
        field_data['multiple'] = element.has_attr('multiple')
        
    elif element_type in ['range', 'number']:
        field_data['min'] = element.get('min')
        field_data['max'] = element.get('max')
        field_data['step'] = element.get('step')
        
    elif element_type == 'textarea':
        field_data['rows'] = element.get('rows')
        field_data['cols'] = element.get('cols')
        field_data['wrap'] = element.get('wrap')
        field_data['maxlength'] = element.get('maxlength')
        field_data['minlength'] = element.get('minlength')
        
    elif element_type in ['button', 'submit', 'reset']:
        field_data['text'] = element.get_text(strip=True) or element.get('value', '')
        field_data['formaction'] = element.get('formaction')
        field_data['formmethod'] = element.get('formmethod')
    
    return field_data


def parse_select_options(select_element) -> List[Dict[str, Any]]:
    """Parse options from a select element"""
    options = []
    has_optgroups = False
    
    # Process direct option children
    direct_options = [child for child in select_element.children 
                     if hasattr(child, 'name') and child.name == 'option']
    
    for option in direct_options:
        options.append(parse_option(option))
    
    # Process optgroups
    optgroups = select_element.find_all('optgroup')
    if optgroups:
        has_optgroups = True
        for optgroup in optgroups:
            group_data = {
                'type': 'optgroup',
                'label': optgroup.get('label'),
                'disabled': optgroup.has_attr('disabled'),
                'options': []
            }
            
            for option in optgroup.find_all('option'):
                group_data['options'].append(parse_option(option))
            
            options.append(group_data)
    
    return options


def parse_option(option) -> Dict[str, Any]:
    """Parse a single option element"""
    option_text = option.get_text(strip=True)
    
    return {
        'type': 'option',
        'value': option.get('value', option_text),
        'text': option_text,
        'selected': option.has_attr('selected'),
        'disabled': option.has_attr('disabled'),
        'hidden': option.has_attr('hidden'),
        'label': option.get('label'),
        'title': option.get('title')
    }


def get_element_type(element) -> str:
    """Get the type of form element"""
    tag_name = element.name.lower()
    if tag_name == 'input':
        return element.get('type', 'text')
    return tag_name


def get_element_value(element) -> Any:
    """Get the value of an element"""
    element_type = get_element_type(element)
    
    if element_type == 'hidden':
        return None  # Hide sensitive data
    
    if element_type == 'file':
        return None  # File inputs handled separately
    
    if element.name == 'select':
        selected_options = element.find_all('option', selected=True)
        if element.has_attr('multiple'):
            return [opt.get('value', opt.get_text(strip=True)) for opt in selected_options]
        elif selected_options:
            return selected_options[0].get('value', selected_options[0].get_text(strip=True))
        return None
    
    if element.name == 'textarea':
        return element.get_text(strip=True)
    
    return element.get('value')


def is_element_hidden(element) -> bool:
    """Check if element is hidden"""
    if element.get('type') == 'hidden':
        return True
    if element.has_attr('hidden'):
        return True
    
    style = element.get('style', '')
    if 'display:none' in style.replace(' ', '') or 'visibility:hidden' in style.replace(' ', ''):
        return True
    
    return False


def get_label_info(element, labels_map: Dict) -> Dict[str, Any]:
    """Get label information for an element"""
    element_id = element.get('id')
    
    if element_id and element_id in labels_map:
        return labels_map[element_id]
    
    # Check for aria-label
    aria_label = element.get('aria-label')
    if aria_label:
        return {'text': aria_label, 'required': False}
    
    return {'text': None, 'required': False}


def get_validation_info(element) -> Dict[str, Any]:
    """Get validation information"""
    return {
        'pattern': element.get('pattern'),
        'minLength': element.get('minlength'),
        'maxLength': element.get('maxlength'),
        'min': element.get('min'),
        'max': element.get('max'),
        'step': element.get('step')
    }


def get_accessibility_info(element) -> Dict[str, Any]:
    """Get accessibility information"""
    return {
        'role': element.get('role'),
        'aria-label': element.get('aria-label'),
        'aria-labelledby': element.get('aria-labelledby'),
        'aria-describedby': element.get('aria-describedby'),
        'aria-required': element.get('aria-required'),
        'aria-invalid': element.get('aria-invalid'),
        'aria-expanded': element.get('aria-expanded')
    }


# Usage example:
# result = await detect_forms_helper_python(page) 