/**
 * Progress bar navigation checker
 * Analyzes current step and available navigation steps
 */

function checkProgressBar() {
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
} 