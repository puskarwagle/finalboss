/**
 * Resume Store
 * Centralized state management for resumes using Svelte stores
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { ResumeData, WorkExperience, Education, Skill, Certification, Project, Language } from './types';
import { getTemplateById } from './templates';

// Generate UUID helper (fallback if uuid not available)
function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Store for all user resumes
const createResumesStore = () => {
  const { subscribe, set, update } = writable<ResumeData[]>([]);
  
  // Add function defined outside return so it can be used by duplicate
  function add(resume: Omit<ResumeData, 'id' | 'createdAt' | 'updatedAt'>): ResumeData {
    const newResume: ResumeData = {
      ...resume,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    update(resumes => [...resumes, newResume]);
    return newResume;
  }
  
  return {
    subscribe,
    set,
    update,
    // Get a specific resume by ID
    getById: (id: string): ResumeData | undefined => {
      const resumes = get({ subscribe });
      return resumes.find(r => r.id === id);
    },
    // Add a new resume
    add,
    // Update an existing resume
    updateById: (id: string, updates: Partial<ResumeData>): void => {
      update(resumes => 
        resumes.map(r => 
          r.id === id 
            ? { ...r, ...updates, updatedAt: new Date().toISOString() }
            : r
        )
      );
    },
    // Delete a resume
    delete: (id: string): void => {
      update(resumes => resumes.filter(r => r.id !== id));
    },
    // Duplicate a resume
    duplicate: (id: string): ResumeData | undefined => {
      const resume = get({ subscribe }).find(r => r.id === id);
      if (resume) {
        return add({
          ...resume,
          title: `${resume.title} (Copy)`,
        });
      }
    },
  };
};

export const resumesStore = createResumesStore();

// Store for the currently active/editing resume
export const activeResume = writable<ResumeData | null>(null);

// Store for available templates
export const templates = writable<any[]>([]); // Will be imported from templates

/**
 * Create a new empty resume with a template
 */
export function createEmptyResume(templateId: string, title: string = 'New Resume'): ResumeData {
  const template = getTemplateById(templateId);
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  return {
    id: generateId(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateId,
    personalInfo: {
      fullName: 'John Doe',
      title: 'Software Engineer',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
      linkedin: 'linkedin.com/in/johndoe',
      github: 'github.com/johndoe',
    },
    summary: 'Experienced Software Engineer with 5+ years of expertise in full-stack development, cloud architecture, and team leadership. Proven track record of delivering scalable applications that drive business growth.',
    experience: [
      {
        id: generateId(),
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Innovations Inc.',
        startDate: 'Jan 2020',
        endDate: 'Present',
        achievements: [
          'Led a team of 5 engineers to develop and launch a microservices-based SaaS platform serving 100K+ users',
          'Reduced application response time by 40% through optimization and caching strategies',
          'Implemented CI/CD pipelines that decreased deployment time by 60%',
        ],
      },
      {
        id: generateId(),
        jobTitle: 'Software Engineer',
        company: 'Digital Solutions Co.',
        startDate: 'Jun 2018',
        endDate: 'Dec 2019',
        achievements: [
          'Developed RESTful APIs handling 1M+ requests per day',
          'Collaborated with cross-functional teams to deliver features ahead of schedule',
          'Mentored junior developers and conducted code reviews',
        ],
      },
    ],
    education: [
      {
        id: generateId(),
        degree: 'Bachelor of Science in Computer Science',
        institution: 'State University',
        graduationDate: '2018',
        gpa: '3.8',
      },
    ],
    skills: [
      createSkill('JavaScript', 'Languages'),
      createSkill('TypeScript', 'Languages'),
      createSkill('Python', 'Languages'),
      createSkill('React', 'Frameworks'),
      createSkill('Node.js', 'Frameworks'),
      createSkill('AWS', 'Cloud'),
      createSkill('Docker', 'DevOps'),
      createSkill('PostgreSQL', 'Databases'),
    ],
    certifications: [
      {
        id: generateId(),
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2021',
      },
      {
        id: generateId(),
        name: 'Google Cloud Professional Cloud Architect',
        issuer: 'Google Cloud',
        date: '2020',
      },
    ],
    projects: [
      {
        id: generateId(),
        title: 'E-Commerce Platform',
        description: [
          'Built a scalable e-commerce platform using React and Node.js serving 50K+ products',
          'Implemented payment gateway integration with Stripe and PayPal',
          'Optimized database queries resulting in 50% faster page load times',
        ],
      },
    ],
    languages: [
      {
        id: generateId(),
        name: 'English',
        proficiency: 'Native',
      },
      {
        id: generateId(),
        name: 'Spanish',
        proficiency: 'Fluent',
      },
    ],
    customSections: [],
  };
}

/**
 * Create a new experience entry
 */
export function createExperience(): WorkExperience {
  return {
    id: generateId(),
    jobTitle: '',
    company: '',
    startDate: '',
    endDate: null,
    achievements: [],
  };
}

/**
 * Create a new education entry
 */
export function createEducation(): Education {
  return {
    id: generateId(),
    degree: '',
    institution: '',
    graduationDate: '',
  };
}

/**
 * Create a new skill
 */
export function createSkill(name: string = '', category: string = 'Other'): Skill {
  return {
    id: generateId(),
    name,
    category,
  };
}

/**
 * Create a new certification
 */
export function createCertification(): Certification {
  return {
    id: generateId(),
    name: '',
    issuer: '',
    date: '',
  };
}

/**
 * Create a new project
 */
export function createProject(): Project {
  return {
    id: generateId(),
    title: '',
    description: [],
  };
}

/**
 * Create a new language
 */
export function createLanguage(): Language {
  return {
    id: generateId(),
    name: '',
    proficiency: 'Intermediate',
  };
}

/**
 * Initialize the store with any persisted resumes
 */
export async function loadResumes(): Promise<void> {
  if (!browser) return;
  
  try {
    // Try to load from localStorage first
    const stored = localStorage.getItem('questBot_resumes');
    if (stored) {
      const resumes = JSON.parse(stored);
      resumesStore.set(resumes);
    }
    
    // TODO: Load from Tauri file system in production
  } catch (error) {
    console.error('Failed to load resumes:', error);
  }
}

/**
 * Persist resumes to storage
 */
export async function saveResumes(): Promise<void> {
  if (!browser) return;
  
  try {
    const resumes = get(resumesStore);
    localStorage.setItem('questBot_resumes', JSON.stringify(resumes));
    
    // TODO: Save to Tauri file system in production
  } catch (error) {
    console.error('Failed to save resumes:', error);
  }
}

/**
 * Auto-save function - call this whenever resumes change
 */
export function autoSave(): void {
  // Don't await - fire and forget for auto-save
  saveResumes().catch(err => console.error('Auto-save failed:', err));
}

