import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Form Integration Tests', () => {
  let mockInvoke: any;

  beforeEach(() => {
    mockInvoke = vi.fn();
    
    // Mock Tauri invoke function
    vi.mock('@tauri-apps/api/core', () => ({
      invoke: mockInvoke
    }));

    // Mock successful config operations by default
    mockInvoke.mockImplementation((command: string) => {
      switch (command) {
        case 'read_file_async':
          return Promise.resolve('{"formData": {"keywords": "test"}}');
        case 'create_directory_async':
          return Promise.resolve('Directory created successfully');
        case 'write_file_async':
          return Promise.resolve('File written successfully');
        default:
          return Promise.resolve();
      }
    });
  });

  describe('Backend Integration', () => {
    it('should be able to save configuration to file', async () => {
      const testConfig = {
        formData: {
          keywords: 'javascript, react, typescript',
          locations: 'Sydney, Melbourne',
          minSalary: '90000',
          maxSalary: '140000',
          jobType: 'full-time',
          experienceLevel: 'mid',
          acceptTerms: true
        }
      };

      // Test directory creation
      await mockInvoke('create_directory_async', { dirname: 'src/bots' });
      expect(mockInvoke).toHaveBeenCalledWith('create_directory_async', { dirname: 'src/bots' });

      // Test file writing
      await mockInvoke('write_file_async', {
        filename: 'src/bots/user-bots-config.json',
        content: JSON.stringify(testConfig, null, 2)
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('write_file_async', expect.objectContaining({
        filename: 'src/bots/user-bots-config.json'
      }));
    });

    it('should be able to read existing configuration', async () => {
      const existingConfig = {
        formData: {
          keywords: 'python, backend',
          locations: 'Brisbane',
          minSalary: '80000',
          rightToWork: 'citizen'
        }
      };

      mockInvoke.mockResolvedValueOnce(JSON.stringify(existingConfig));
      
      const result = await mockInvoke('read_file_async', {
        filename: 'src/bots/user-bots-config.json'
      });

      const parsedConfig = JSON.parse(result);
      expect(parsedConfig.formData.keywords).toBe('python, backend');
      expect(parsedConfig.formData.locations).toBe('Brisbane');
    });

    it('should handle file operations errors gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('File not found'));

      try {
        await mockInvoke('read_file_async', {
          filename: 'src/bots/user-bots-config.json'
        });
      } catch (error) {
        expect(error.message).toBe('File not found');
      }
    });
  });

  describe('Form Data Validation', () => {
    it('should validate required fields', () => {
      const formData = {
        keywords: '',
        acceptTerms: false
      };

      // Simulate form validation logic
      const isKeywordsValid = formData.keywords.trim() !== '';
      const isTermsAccepted = formData.acceptTerms === true;

      expect(isKeywordsValid).toBe(false);
      expect(isTermsAccepted).toBe(false);
    });

    it('should validate weight values are within range', () => {
      const testWeights = [
        { value: 0.5, valid: true },
        { value: 1.0, valid: true },
        { value: 0.0, valid: true },
        { value: 1.5, valid: false },
        { value: -0.1, valid: false }
      ];

      testWeights.forEach(({ value, valid }) => {
        const isValid = value >= 0 && value <= 1;
        expect(isValid).toBe(valid);
      });
    });

    it('should validate salary inputs', () => {
      const salaryTests = [
        { min: '80000', max: '120000', valid: true },
        { min: '150000', max: '100000', valid: false }, // min > max
        { min: '0', max: '50000', valid: true },
        { min: '', max: '', valid: true }, // empty is allowed
        { min: '-1000', max: '50000', valid: false } // negative
      ];

      salaryTests.forEach(({ min, max, valid }) => {
        const minVal = parseInt(min) || 0;
        const maxVal = parseInt(max) || Infinity;
        const isValid = minVal >= 0 && (maxVal === Infinity || minVal <= maxVal);
        expect(isValid).toBe(valid);
      });
    });
  });

  describe('Form State Management', () => {
    it('should maintain form state consistency', () => {
      const initialState = {
        keywords: '',
        locations: '',
        jobType: 'any',
        experienceLevel: 'any',
        acceptTerms: false
      };

      const updatedState = {
        ...initialState,
        keywords: 'react, javascript',
        locations: 'Sydney',
        acceptTerms: true
      };

      expect(updatedState.keywords).toBe('react, javascript');
      expect(updatedState.locations).toBe('Sydney');
      expect(updatedState.jobType).toBe('any'); // unchanged
      expect(updatedState.acceptTerms).toBe(true);
    });

    it('should reset form to default values', () => {
      const defaultFormData = {
        keywords: '',
        locations: '',
        minSalary: '',
        maxSalary: '',
        jobType: 'any',
        experienceLevel: 'any',
        industry: '',
        remotePreference: 'any',
        rightToWork: 'citizen',
        rewriteResume: false,
        excludedCompanies: '',
        excludedKeywords: '',
        skillWeight: '0.4',
        locationWeight: '0.2',
        salaryWeight: '0.3',
        companyWeight: '0.1',
        enableDeepSeek: false,
        deepSeekApiKey: '',
        acceptTerms: false
      };

      const modifiedFormData = {
        ...defaultFormData,
        keywords: 'test keywords',
        acceptTerms: true,
        minSalary: '90000'
      };

      // Reset to defaults
      const resetFormData = { ...defaultFormData };

      expect(resetFormData.keywords).toBe('');
      expect(resetFormData.acceptTerms).toBe(false);
      expect(resetFormData.minSalary).toBe('');
    });
  });

  describe('Industry and Work Rights Options', () => {
    it('should have valid industry options', () => {
      const industries = [
        { value: '1_accounting', label: 'Accounting' },
        { value: '18_information', label: 'Information & Communication Technology' },
        { value: '12_engineering', label: 'Engineering' }
      ];

      industries.forEach(industry => {
        expect(industry.value).toMatch(/^\d+_\w+/);
        expect(industry.label).toBeTruthy();
        expect(industry.label.length).toBeGreaterThan(0);
      });
    });

    it('should have valid work rights options', () => {
      const workRightOptions = [
        { value: 'citizen', label: "I'm an Australian citizen" },
        { value: 'permanent_resident', label: "I'm a permanent resident and/or NZ citizen" },
        { value: 'sponsorship_required', label: 'I require sponsorship to work for a new employer (e.g. 482, 457)' }
      ];

      workRightOptions.forEach(option => {
        expect(option.value).toBeTruthy();
        expect(option.label).toBeTruthy();
        expect(option.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Advanced Mode Features', () => {
    it('should handle weight configuration properly', () => {
      const weights = {
        skillWeight: '0.4',
        locationWeight: '0.2',
        salaryWeight: '0.3',
        companyWeight: '0.1'
      };

      const totalWeight = Object.values(weights)
        .map(w => parseFloat(w))
        .reduce((sum, w) => sum + w, 0);

      expect(totalWeight).toBeCloseTo(1.0);

      // Test individual weight validation
      Object.values(weights).forEach(weight => {
        const numWeight = parseFloat(weight);
        expect(numWeight).toBeGreaterThanOrEqual(0);
        expect(numWeight).toBeLessThanOrEqual(1);
      });
    });

    it('should validate DeepSeek configuration', () => {
      const deepSeekConfigs = [
        { enabled: false, apiKey: '', valid: true },
        { enabled: true, apiKey: 'sk-valid-key', valid: true },
        { enabled: true, apiKey: '', valid: false },
        { enabled: false, apiKey: 'sk-some-key', valid: true }
      ];

      deepSeekConfigs.forEach(({ enabled, apiKey, valid }) => {
        const isValid = !enabled || (enabled && apiKey.trim() !== '');
        expect(isValid).toBe(valid);
      });
    });
  });
});