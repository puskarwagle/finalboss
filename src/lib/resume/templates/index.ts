/**
 * Resume Templates Registry
 * ATS-friendly templates inspired by resume.io
 * Phase 1: 4 distinct templates (T1, P1, C1, M1)
 * Phase 2: 8 additional templates (T2, T3, P2, P3, C2, C3, M2, M3)
 */

import type { TemplateMetadata } from '../types';
import { 
  classicBlueStyle, 
  corporateGreenStyle, 
  minimalistWhiteStyle, 
  techModernStyle,
  professionalNavyStyle,
  timelessBlackStyle,
  executiveGrayStyle,
  businessBlueStyle,
  modernMinimalStyle,
  cleanSerifStyle,
  creativeBoldStyle,
  sleekDarkStyle
} from './configs';

export const TEMPLATES: TemplateMetadata[] = [
  // T1: Classic Blue (Traditional)
  {
    id: 'traditional-classic-blue',
    name: 'Classic Blue',
    description: 'Timeless traditional template with deep blue accents and serif typography. Perfect for any industry.',
    category: 'traditional',
    atsCompliant: true,
    style: classicBlueStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Summary', required: false, order: 2 },
      { id: 'experience', title: 'Work Experience', required: true, order: 3, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 4, maxItems: 10 },
      { id: 'skills', title: 'Skills', required: true, order: 5 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'projects', title: 'Projects', required: false, order: 7 },
    ]
  },
  // P1: Corporate Green (Professional)
  {
    id: 'professional-corporate-green',
    name: 'Corporate Green',
    description: 'Professional template with forest green accents. Ideal for showcasing reliability and expertise.',
    category: 'professional',
    atsCompliant: true,
    style: corporateGreenStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Summary', required: false, order: 2 },
      { id: 'skills', title: 'Skills', required: true, order: 3 },
      { id: 'experience', title: 'Professional Experience', required: true, order: 4, maxItems: 10 },
      { id: 'education', title: 'Education & Training', required: true, order: 5, maxItems: 10 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'languages', title: 'Languages', required: false, order: 7 },
    ]
  },
  // C1: Minimalist White (Clean)
  {
    id: 'clean-minimalist-white',
    name: 'Minimalist White',
    description: 'Ultra-clean design with generous white space and minimal styling. Perfect for ATS systems.',
    category: 'clean',
    atsCompliant: true,
    style: minimalistWhiteStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Summary', required: false, order: 2 },
      { id: 'experience', title: 'Experience', required: true, order: 3, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 4, maxItems: 10 },
      { id: 'skills', title: 'Skills', required: true, order: 5 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'projects', title: 'Projects', required: false, order: 7 },
      { id: 'languages', title: 'Languages', required: false, order: 8 },
    ]
  },
  // M1: Tech Modern (Modern)
  {
    id: 'modern-tech-purple',
    name: 'Tech Modern',
    description: 'Bold modern template with purple accents. Perfect for tech and innovative industries.',
    category: 'modern',
    atsCompliant: true,
    style: techModernStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Profile', required: false, order: 2 },
      { id: 'skills', title: 'Core Competencies', required: true, order: 3 },
      { id: 'experience', title: 'Work Experience', required: true, order: 4, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 5, maxItems: 10 },
      { id: 'projects', title: 'Key Projects', required: false, order: 6 },
      { id: 'certifications', title: 'Certifications', required: false, order: 7 },
    ]
  },
  // T2: Professional Navy (Traditional)
  {
    id: 'traditional-professional-navy',
    name: 'Professional Navy',
    description: 'Elegant traditional template with navy blue accents and two-column header layout.',
    category: 'traditional',
    atsCompliant: true,
    style: professionalNavyStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Summary', required: false, order: 2 },
      { id: 'experience', title: 'Work Experience', required: true, order: 3, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 4, maxItems: 10 },
      { id: 'skills', title: 'Skills', required: true, order: 5 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'projects', title: 'Projects', required: false, order: 7 },
    ]
  },
  // T3: Timeless Black (Traditional)
  {
    id: 'traditional-timeless-black',
    name: 'Timeless Black',
    description: 'Classic black and white design with bold headers and compact corporate format.',
    category: 'traditional',
    atsCompliant: true,
    style: timelessBlackStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Summary', required: false, order: 2 },
      { id: 'experience', title: 'Work Experience', required: true, order: 3, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 4, maxItems: 10 },
      { id: 'skills', title: 'Skills', required: true, order: 5 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'projects', title: 'Projects', required: false, order: 7 },
    ]
  },
  // P2: Executive Gray (Professional)
  {
    id: 'professional-executive-gray',
    name: 'Executive Gray',
    description: 'Sophisticated professional template with two-column skills layout and dotted dividers.',
    category: 'professional',
    atsCompliant: true,
    style: executiveGrayStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Summary', required: false, order: 2 },
      { id: 'skills', title: 'Skills', required: true, order: 3 },
      { id: 'experience', title: 'Professional Experience', required: true, order: 4, maxItems: 10 },
      { id: 'education', title: 'Education & Training', required: true, order: 5, maxItems: 10 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'languages', title: 'Languages', required: false, order: 7 },
    ]
  },
  // P3: Business Blue (Professional)
  {
    id: 'professional-business-blue',
    name: 'Business Blue',
    description: 'Professional blue template with accent boxes and compact business formatting.',
    category: 'professional',
    atsCompliant: true,
    style: businessBlueStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Summary', required: false, order: 2 },
      { id: 'skills', title: 'Skills', required: true, order: 3 },
      { id: 'experience', title: 'Professional Experience', required: true, order: 4, maxItems: 10 },
      { id: 'education', title: 'Education & Training', required: true, order: 5, maxItems: 10 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'languages', title: 'Languages', required: false, order: 7 },
    ]
  },
  // C2: Modern Minimal (Clean)
  {
    id: 'clean-modern-minimal',
    name: 'Modern Minimal',
    description: 'Ultra-modern clean design with soft blue accents and dotted dividers.',
    category: 'clean',
    atsCompliant: true,
    style: modernMinimalStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Summary', required: false, order: 2 },
      { id: 'experience', title: 'Experience', required: true, order: 3, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 4, maxItems: 10 },
      { id: 'skills', title: 'Skills', required: true, order: 5 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'projects', title: 'Projects', required: false, order: 7 },
      { id: 'languages', title: 'Languages', required: false, order: 8 },
    ]
  },
  // C3: Clean Serif (Clean)
  {
    id: 'clean-clean-serif',
    name: 'Clean Serif',
    description: 'Elegant serif typography with generous spacing and refined classic design.',
    category: 'clean',
    atsCompliant: true,
    style: cleanSerifStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Summary', required: false, order: 2 },
      { id: 'experience', title: 'Experience', required: true, order: 3, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 4, maxItems: 10 },
      { id: 'skills', title: 'Skills', required: true, order: 5 },
      { id: 'certifications', title: 'Certifications', required: false, order: 6 },
      { id: 'projects', title: 'Projects', required: false, order: 7 },
      { id: 'languages', title: 'Languages', required: false, order: 8 },
    ]
  },
  // M2: Creative Bold (Modern) - 2-Column Sidebar
  {
    id: 'modern-creative-bold',
    name: 'Creative Bold',
    description: 'Bold modern template with red accents and two-column sidebar layout. Perfect for creative professionals.',
    category: 'modern',
    atsCompliant: true,
    style: creativeBoldStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Profile', required: false, order: 2 },
      { id: 'skills', title: 'Core Competencies', required: true, order: 3 },
      { id: 'experience', title: 'Work Experience', required: true, order: 4, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 5, maxItems: 10 },
      { id: 'projects', title: 'Key Projects', required: false, order: 6 },
      { id: 'certifications', title: 'Certifications', required: false, order: 7 },
      { id: 'languages', title: 'Languages', required: false, order: 8 },
    ]
  },
  // M3: Sleek Dark (Modern) - 3-Column
  {
    id: 'modern-sleek-dark',
    name: 'Sleek Dark',
    description: 'Contemporary three-column layout with cyan accents. Maximum content density with modern design.',
    category: 'modern',
    atsCompliant: true,
    style: sleekDarkStyle,
    sections: [
      { id: 'personalInfo', title: 'Personal Information', required: true, order: 1 },
      { id: 'summary', title: 'Professional Profile', required: false, order: 2 },
      { id: 'skills', title: 'Core Competencies', required: true, order: 3 },
      { id: 'experience', title: 'Work Experience', required: true, order: 4, maxItems: 10 },
      { id: 'education', title: 'Education', required: true, order: 5, maxItems: 10 },
      { id: 'projects', title: 'Key Projects', required: false, order: 6 },
      { id: 'certifications', title: 'Certifications', required: false, order: 7 },
      { id: 'languages', title: 'Languages', required: false, order: 8 },
    ]
  }
];

export function getTemplateById(id: string): TemplateMetadata | undefined {
  return TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: TemplateMetadata['category']): TemplateMetadata[] {
  return TEMPLATES.filter(t => t.category === category);
}


