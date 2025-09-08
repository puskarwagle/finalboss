/**
 * Quick apply vs regular apply detection
 * Button scanning logic
 */

function detectQuickApply() {
    const container = document.querySelector('[data-automation="jobDetailsPage"]') || document.body;
    
    // Case-insensitive text matcher
    const hasText = (el, txt) => (el.textContent || '').toLowerCase().includes(String(txt).toLowerCase());
    
    // Look for buttons/elements containing "Quick apply" text (case-insensitive)
    const quickApplyElements = Array.from(container.querySelectorAll('*')).filter(el => hasText(el, 'Quick apply'));
    
    // Attribute-based: explicit job detail apply button
    const quickApplyAttr = Array.from(container.querySelectorAll('[data-automation="job-detail-apply"]'));
    
    // Also check for regular Apply buttons to distinguish (avoid counting Quick)
    const regularApplyElements = Array.from(container.querySelectorAll('*')).filter(el => {
        const txt = (el.textContent || '').trim();
        if (!txt) return false;
        const lower = txt.toLowerCase();
        return lower === 'apply' || (lower.includes('apply') && !lower.includes('quick'));
    });
    
    const hasQuick = quickApplyElements.length > 0 || quickApplyAttr.length > 0;
    const hasRegular = regularApplyElements.length > 0;

    return {
        hasQuickApply: hasQuick,
        hasRegularApply: hasRegular,
        quickApplyCount: quickApplyElements.length + quickApplyAttr.length,
        quickApplyText: quickApplyElements.map(el => (el.textContent || '').trim()).concat(quickApplyAttr.map(el => (el.getAttribute('data-automation') || ''))),
        regularApplyText: regularApplyElements.map(el => (el.textContent || '').trim())
    };
}

function clickQuickApplyButton() {
    const container = document.querySelector('[data-automation="jobDetailsPage"]') || document.body;
    const candidates = [];
    candidates.push(...Array.from(container.querySelectorAll('[data-automation="job-detail-apply"]')));
    candidates.push(...Array.from(container.querySelectorAll('*')).filter(el => (el.textContent || '').toLowerCase().includes('quick apply')));
    
    // Click the first clickable candidate
    for (const el of candidates) {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'button' || tag === 'a' || el.onclick || el.href) {
            el.click();
            return true;
        }
    }
    return false;
} 