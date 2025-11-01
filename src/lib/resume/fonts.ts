/**
 * Resume Font Library
 * Professional fonts for resume customization
 */

export const RESUME_FONTS = {
  'Arial': { 
    family: 'Arial, sans-serif',
    docxFont: 'Arial',
    category: 'sans-serif',
    style: 'modern',
    description: 'Modern sans-serif, clean and neutral'
  },
  'Calibri': {
    family: 'Calibri, sans-serif',
    docxFont: 'Calibri',
    category: 'sans-serif',
    style: 'modern',
    description: 'Microsoft Word default, safe and readable'
  },
  'Cambria': {
    family: 'Cambria, serif',
    docxFont: 'Cambria',
    category: 'serif',
    style: 'elegant',
    description: 'Serif designed for on-screen reading'
  },
  'Helvetica': {
    family: 'Helvetica, Arial, sans-serif',
    docxFont: 'Helvetica',
    category: 'sans-serif',
    style: 'professional',
    description: 'Designer favorite, modern and professional'
  },
  'Garamond': {
    family: 'Garamond, serif',
    docxFont: 'Garamond',
    category: 'serif',
    style: 'formal',
    description: 'Traditional serif, formal and elegant'
  },
  'Georgia': {
    family: 'Georgia, serif',
    docxFont: 'Georgia',
    category: 'serif',
    style: 'classic',
    description: 'Serif with excellent screen readability'
  },
  'Verdana': {
    family: 'Verdana, sans-serif',
    docxFont: 'Verdana',
    category: 'sans-serif',
    style: 'readable',
    description: 'Wide spacing, highly readable'
  },
  'Book Antiqua': {
    family: '"Book Antiqua", serif',
    docxFont: 'Book Antiqua',
    category: 'serif',
    style: 'traditional',
    description: 'Classic traditional feel'
  },
  'Times New Roman': {
    family: '"Times New Roman", serif',
    docxFont: 'Times New Roman',
    category: 'serif',
    style: 'classic',
    description: 'Classic font, traditional and safe'
  },
  'Trebuchet MS': {
    family: '"Trebuchet MS", sans-serif',
    docxFont: 'Trebuchet MS',
    category: 'sans-serif',
    style: 'modern',
    description: 'Modern sans-serif with flair'
  }
} as const;

export type FontName = keyof typeof RESUME_FONTS;

export const FONT_NAMES = Object.keys(RESUME_FONTS) as FontName[];

/**
 * Get font family string for web/CSS
 */
export function getFontFamily(fontName: FontName): string {
  return RESUME_FONTS[fontName].family;
}

/**
 * Get DOCX-compatible font name
 */
export function getDocxFont(fontName: FontName): string {
  return RESUME_FONTS[fontName].docxFont;
}

/**
 * Get font metadata
 */
export function getFontInfo(fontName: FontName) {
  return RESUME_FONTS[fontName];
}

