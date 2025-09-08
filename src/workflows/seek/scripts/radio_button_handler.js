/**
 * Radio button click handler for cover letter options
 * Handles clicking and triggering events for radio inputs
 */

function clickCoverLetterRadio() {
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
} 