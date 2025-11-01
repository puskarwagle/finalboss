/**
 * Font Helper Functions
 * Get effective fonts and sizes based on user settings and template defaults
 */

import type { ResumeData, TemplateStyle } from '../types';
import { getFontFamily, getDocxFont, FONT_NAMES, type FontName } from '../fonts';

/**
 * Get effective font family for a given type
 */
export function getEffectiveFont(
  resumeData: ResumeData,
  templateStyle: TemplateStyle,
  fontType: 'header' | 'body' | 'contact'
): string {
  if (resumeData.fontSettings && !resumeData.fontSettings.useTemplateFonts) {
    const fontName = fontType === 'header' 
      ? resumeData.fontSettings.headerFont
      : fontType === 'body'
      ? resumeData.fontSettings.bodyFont
      : resumeData.fontSettings.contactFont;
    
    if (fontName) {
      // Map font name to font family if it's from our library
      if (FONT_NAMES.includes(fontName as FontName)) {
        return getFontFamily(fontName as FontName);
      }
      return fontName; // Fallback to direct font family string
    }
  }
  
  // Return template default
  switch (fontType) {
    case 'header': return templateStyle.headerFont;
    case 'body': return templateStyle.bodyFont;
    case 'contact': return templateStyle.contactFont;
  }
}

/**
 * Get effective font size for a given type
 */
export function getEffectiveFontSize(
  resumeData: ResumeData,
  templateStyle: TemplateStyle,
  fontSizeType: 'header' | 'body' | 'contact' | 'name'
): number {
  if (resumeData.fontSettings && !resumeData.fontSettings.useTemplateFonts) {
    switch (fontSizeType) {
      case 'header': 
        return resumeData.fontSettings.headerFontSize || templateStyle.headerFontSize;
      case 'body': 
        return resumeData.fontSettings.bodyFontSize || templateStyle.bodyFontSize;
      case 'contact': 
        return resumeData.fontSettings.contactFontSize || templateStyle.contactFontSize;
      case 'name': 
        return resumeData.fontSettings.nameFontSize || templateStyle.headerFontSize;
    }
  }
  
  // Return template default
  switch (fontSizeType) {
    case 'header': return templateStyle.headerFontSize;
    case 'body': return templateStyle.bodyFontSize;
    case 'contact': return templateStyle.contactFontSize;
    case 'name': return templateStyle.headerFontSize;
  }
}

/**
 * Get letter spacing CSS value
 */
export function getLetterSpacing(resumeData: ResumeData): string {
  if (!resumeData.fontSettings) return 'normal';
  
  switch (resumeData.fontSettings.letterSpacing) {
    case 'tight': return '-0.5px';
    case 'loose': return '0.5px';
    case 'normal':
    default: return 'normal';
  }
}

/**
 * Get line spacing value
 */
export function getLineSpacing(resumeData: ResumeData): number {
  return resumeData.fontSettings?.lineSpacing || 1.0;
}

/**
 * Get section spacing in points
 */
export function getSectionSpacing(resumeData: ResumeData, templateStyle: TemplateStyle): number {
  if (!resumeData.fontSettings) return templateStyle.sectionSpacing;
  
  switch (resumeData.fontSettings.sectionSpacing) {
    case 'compact': return 180;
    case 'spacious': return 300;
    case 'normal':
    default: return 240;
  }
}

/**
 * Get DOCX font name from font family string
 */
export function getDocxFontFromFamily(fontFamily: string): string {
  // Extract first font name from font stack
  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  
  // Check if it's a font from our library
  if (FONT_NAMES.includes(fontName as FontName)) {
    return getDocxFont(fontName as FontName);
  }
  
  // Fallback to font name as-is
  return fontName || 'Arial';
}

