/**
 * Massive text extraction logic for job content
 * Handles DOM walking, cleaning, and title/details splitting
 */

function extractJobContent() {
    const container = document.querySelector('[data-automation="jobDetailsPage"]');
    if (!container) return null;

    const texts = [];
    const walker = document.createTreeWalker(
        container, 
        NodeFilter.SHOW_TEXT, 
        {
            acceptNode: function(node) {
                // Skip text nodes inside style, script, or hidden elements
                let parent = node.parentElement;
                while (parent && parent !== container) {
                    const tagName = parent.tagName.toLowerCase();
                    const style = window.getComputedStyle(parent);
                    
                    if (tagName === 'style' || 
                        tagName === 'script' || 
                        tagName === 'noscript' ||
                        style.display === 'none' ||
                        style.visibility === 'hidden') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    parent = parent.parentElement;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }, 
        false
    );

    while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        if (text !== '') {
            texts.push(text);
        }
    }

    // Remove duplicates and join
    const allText = [...new Set(texts)].join('\n');

    // Remove unwanted lines (case-sensitive, exact matches)
    const unwantedLines = [
        'View all jobs',
        'Quick apply',
        'Apply',
        'Save', 
        'Report this job advert',
        'Be careful',
        "Don't provide your bank or credit card details when applying for jobs.",
        'Learn how to protect yourself',
        'Report this job ad',
        'Career Advice',
        'Researching careers? Find all the information and tips you need on career advice.',
        'Role descriptions',
        'Salary insights', 
        'Tools to help you prepare for jobs',
        'Explore Career Advice'
    ];

    // Remove rating and review patterns
    const ratingReviewPatterns = [
        /^\d+\.\d+$/,  // Matches ratings like "3.4", "4.2"
        /^\d+\s+reviews?$/,  // Matches "1071 reviews", "5 review"
        /^·$/  // Matches the dot separator "·"
    ];

    let cleanedLines = allText.split('\n').filter(line => {
        const trimmed = line.trim();
        if (trimmed === '') return false;
        if (unwantedLines.includes(trimmed)) return false;
        
        // Check against rating/review patterns
        for (const pattern of ratingReviewPatterns) {
            if (pattern.test(trimmed)) return false;
        }
        
        return true;
    });

    const cleanedText = cleanedLines.join('\n');

    // Find title split point: look for multiple apply button patterns
    let titleEndIndex = -1;

    // Pattern 1: "Quick apply" followed by "Save"
    for (let i = 0; i < cleanedLines.length - 1; i++) {
        if (cleanedLines[i].trim() === 'Quick apply' && cleanedLines[i + 1].trim() === 'Save') {
            titleEndIndex = i;
            break;
        }
    }

    // Pattern 2: Just "Apply" (without Quick apply)
    if (titleEndIndex === -1) {
        for (let i = 0; i < cleanedLines.length; i++) {
            if (cleanedLines[i].trim() === 'Apply') {
                titleEndIndex = i;
                break;
            }
        }
    }

    // If pattern not found in cleaned text, search in original
    if (titleEndIndex === -1) {
        const originalLines = allText.split('\n');
        
        // Try "Quick apply" + "Save" in original
        for (let i = 0; i < originalLines.length - 1; i++) {
            if (originalLines[i].trim() === 'Quick apply' && originalLines[i + 1].trim() === 'Save') {
                const titleText = originalLines.slice(0, i).join('\n');
                titleEndIndex = cleanedLines.findIndex((line, idx) => {
                    return cleanedLines.slice(0, idx + 1).join('\n').length >= titleText.length;
                });
                break;
            }
        }
        
        // Try just "Apply" in original
        if (titleEndIndex === -1) {
            for (let i = 0; i < originalLines.length; i++) {
                if (originalLines[i].trim() === 'Apply') {
                    const titleText = originalLines.slice(0, i).join('\n');
                    titleEndIndex = cleanedLines.findIndex((line, idx) => {
                        return cleanedLines.slice(0, idx + 1).join('\n').length >= titleText.length;
                    });
                    break;
                }
            }
        }
    }

    let rawTitle = '';
    let jobDetails = cleanedText;

    if (titleEndIndex >= 0) {
        rawTitle = cleanedLines.slice(0, titleEndIndex).join('\n').trim();
        jobDetails = cleanedLines.slice(titleEndIndex).join('\n').trim();
    }

    return {
        raw_title: rawTitle,
        details: jobDetails,
        totalChars: cleanedText.length,
        debug_info: {
            total_lines: cleanedLines.length,
            title_end_index: titleEndIndex,
            original_lines_sample: cleanedLines.slice(0, 10)
        }
    };
} 