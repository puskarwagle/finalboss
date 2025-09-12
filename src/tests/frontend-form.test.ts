import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import FrontendFormPage from './+page.svelte';

describe('Frontend Form Page', () => {
  let mockInvoke: any;

  beforeEach(() => {
    mockInvoke = (global as any).mockInvoke;
    mockInvoke.mockReset();
    
    // Mock successful config operations by default
    mockInvoke.mockImplementation((command: string) => {
      switch (command) {
        case 'read_file_async':
          return Promise.resolve('{"formData": {"keywords": "test"}}');
        case 'create_directory_async':
          return Promise.resolve();
        case 'write_file_async':
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    });
  });

  describe('Form Rendering', () => {
    it('renders all main form sections', async () => {
      render(FrontendFormPage);

      expect(screen.getByText('⚙️ Configuration')).toBeInTheDocument();
      expect(screen.getByText('🎯 Job Preferences')).toBeInTheDocument();
      expect(screen.getByText('🏛️ Work Rights')).toBeInTheDocument();
      expect(screen.getByText('🤖 Application Settings')).toBeInTheDocument();
      expect(screen.getByText('🎯 Quality Filters')).toBeInTheDocument();
      expect(screen.getByText('Legal Disclaimer')).toBeInTheDocument();
    });

    it('renders all required form fields', async () => {
      render(FrontendFormPage);

      // Job Preferences fields
      expect(screen.getByPlaceholderText('python, backend, api, django')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Sydney, Melbourne, Remote')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('80000')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('150000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('any')).toBeInTheDocument();

      // Application Settings
      expect(screen.getByLabelText('Rewrite resume for each Job?')).toBeInTheDocument();
      expect(screen.getByLabelText('Choose File')).toBeInTheDocument();

      // Quality Filters
      expect(screen.getByPlaceholderText('wipro, infosys, tcs')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('junior, intern, php')).toBeInTheDocument();

      // Legal Agreement
      expect(screen.getByLabelText('I understand and accept')).toBeInTheDocument();
    });

    it('renders all buttons', async () => {
      render(FrontendFormPage);

      expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset form/i })).toBeInTheDocument();
    });
  });

  describe('Form Field Interactions', () => {
    it('updates keywords field correctly', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const keywordsInput = screen.getByPlaceholderText('python, backend, api, django');
      await user.type(keywordsInput, 'javascript, react');

      expect(keywordsInput).toHaveValue('javascript, react');
    });

    it('updates salary fields correctly', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const minSalaryInput = screen.getByPlaceholderText('80000');
      const maxSalaryInput = screen.getByPlaceholderText('150000');

      await user.type(minSalaryInput, '90000');
      await user.type(maxSalaryInput, '120000');

      expect(minSalaryInput).toHaveValue(90000);
      expect(maxSalaryInput).toHaveValue(120000);
    });

    it('updates location field correctly', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const locationInput = screen.getByPlaceholderText('Sydney, Melbourne, Remote');
      await user.type(locationInput, 'Brisbane, Perth');

      expect(locationInput).toHaveValue('Brisbane, Perth');
    });

    it('updates select dropdowns correctly', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const jobTypeSelect = screen.getByDisplayValue('Any');
      await user.selectOptions(jobTypeSelect, 'full-time');

      expect(jobTypeSelect).toHaveValue('full-time');
    });

    it('toggles checkboxes correctly', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const rewriteResumeCheckbox = screen.getByLabelText('Rewrite resume for each Job?');
      const legalCheckbox = screen.getByLabelText('I understand and accept');

      expect(rewriteResumeCheckbox).not.toBeChecked();
      expect(legalCheckbox).not.toBeChecked();

      await user.click(rewriteResumeCheckbox);
      await user.click(legalCheckbox);

      expect(rewriteResumeCheckbox).toBeChecked();
      expect(legalCheckbox).toBeChecked();
    });

    it('handles file upload correctly', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const file = new File(['test resume content'], 'resume.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText('Choose File');

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('✓ Uploaded: resume.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Mode Toggle', () => {
    it('toggles advanced mode sections', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const advancedToggle = screen.getByRole('button', { name: /advanced/i });

      // Advanced sections should not be visible initially
      expect(screen.queryByText('🧠 Smart Matching Weights')).not.toBeInTheDocument();
      expect(screen.queryByText('🤖 DeepSeek AI Integration')).not.toBeInTheDocument();

      await user.click(advancedToggle);

      // Advanced sections should now be visible
      expect(screen.getByText('🧠 Smart Matching Weights')).toBeInTheDocument();
      expect(screen.getByText('🤖 DeepSeek AI Integration')).toBeInTheDocument();

      await user.click(advancedToggle);

      // Advanced sections should be hidden again
      expect(screen.queryByText('🧠 Smart Matching Weights')).not.toBeInTheDocument();
      expect(screen.queryByText('🤖 DeepSeek AI Integration')).not.toBeInTheDocument();
    });

    it('shows smart matching weight fields in advanced mode', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const advancedToggle = screen.getByRole('button', { name: /advanced/i });
      await user.click(advancedToggle);

      // Click on smart matching section to expand it
      const smartMatchingHeader = screen.getByText('🧠 Smart Matching Weights');
      await user.click(smartMatchingHeader);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0.4')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('0.2')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('0.3')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('0.1')).toBeInTheDocument();
      });
    });

    it('shows DeepSeek fields in advanced mode', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const advancedToggle = screen.getByRole('button', { name: /advanced/i });
      await user.click(advancedToggle);

      // Click on DeepSeek section to expand it
      const deepSeekHeader = screen.getByText('🤖 DeepSeek AI Integration');
      await user.click(deepSeekHeader);

      await waitFor(() => {
        expect(screen.getByLabelText('Enable DeepSeek')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows alert when keywords are empty on submit', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(FrontendFormPage);

      const legalCheckbox = screen.getByLabelText('I understand and accept');
      await user.click(legalCheckbox);

      const submitButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(submitButton);

      expect(alertSpy).toHaveBeenCalledWith('Keywords are required');
      alertSpy.mockRestore();
    });

    it('shows alert when legal terms not accepted', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(FrontendFormPage);

      const keywordsInput = screen.getByPlaceholderText('python, backend, api, django');
      await user.type(keywordsInput, 'test keywords');

      const submitButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(submitButton);

      expect(alertSpy).toHaveBeenCalledWith('You must accept the legal disclaimer to continue');
      alertSpy.mockRestore();
    });

    it('validates weight fields within 0-1 range', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      const advancedToggle = screen.getByRole('button', { name: /advanced/i });
      await user.click(advancedToggle);

      const smartMatchingHeader = screen.getByText('🧠 Smart Matching Weights');
      await user.click(smartMatchingHeader);

      await waitFor(async () => {
        const skillWeightInput = screen.getByPlaceholderText('0.4');
        
        await user.clear(skillWeightInput);
        await user.type(skillWeightInput, '1.5');
        await user.tab(); // Trigger blur event

        expect(skillWeightInput).toHaveValue(1); // Should be clamped to 1
      });
    });
  });

  describe('Form Submission and File Operations', () => {
    it('successfully submits form with valid data', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(FrontendFormPage);

      // Fill required fields
      const keywordsInput = screen.getByPlaceholderText('python, backend, api, django');
      await user.type(keywordsInput, 'javascript, react');

      const legalCheckbox = screen.getByLabelText('I understand and accept');
      await user.click(legalCheckbox);

      const submitButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Configuration saved successfully!');
      });

      // Verify Tauri commands were called
      expect(mockInvoke).toHaveBeenCalledWith('create_directory_async', { dirname: 'src/bots' });
      expect(mockInvoke).toHaveBeenCalledWith('write_file_async', expect.objectContaining({
        filename: 'src/bots/user-bots-config.json'
      }));

      alertSpy.mockRestore();
    });

    it('handles file creation error gracefully', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock write_file_async to fail
      mockInvoke.mockImplementation((command: string) => {
        if (command === 'write_file_async') {
          return Promise.reject(new Error('Write failed'));
        }
        return Promise.resolve();
      });

      render(FrontendFormPage);

      // Fill required fields
      const keywordsInput = screen.getByPlaceholderText('python, backend, api, django');
      await user.type(keywordsInput, 'javascript, react');

      const legalCheckbox = screen.getByLabelText('I understand and accept');
      await user.click(legalCheckbox);

      const submitButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error saving configuration. Please try again.');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error saving configuration:', expect.any(Error));

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('loads existing configuration on mount', async () => {
      const existingConfig = {
        formData: {
          keywords: 'existing keywords',
          locations: 'existing locations',
          minSalary: '75000'
        }
      };

      mockInvoke.mockImplementation((command: string) => {
        if (command === 'read_file_async') {
          return Promise.resolve(JSON.stringify(existingConfig));
        }
        return Promise.resolve();
      });

      render(FrontendFormPage);

      await waitFor(() => {
        const keywordsInput = screen.getByDisplayValue('existing keywords');
        const locationsInput = screen.getByDisplayValue('existing locations');
        const minSalaryInput = screen.getByDisplayValue('75000');
        
        expect(keywordsInput).toBeInTheDocument();
        expect(locationsInput).toBeInTheDocument();
        expect(minSalaryInput).toBeInTheDocument();
      });

      expect(mockInvoke).toHaveBeenCalledWith('read_file_async', {
        filename: 'src/bots/user-bots-config.json'
      });
    });

    it('creates directory if it does not exist', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(FrontendFormPage);

      // Fill required fields and submit
      const keywordsInput = screen.getByPlaceholderText('python, backend, api, django');
      await user.type(keywordsInput, 'test');

      const legalCheckbox = screen.getByLabelText('I understand and accept');
      await user.click(legalCheckbox);

      const submitButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('create_directory_async', { dirname: 'src/bots' });
      });

      alertSpy.mockRestore();
    });
  });

  describe('Reset Form Functionality', () => {
    it('resets all form fields to default values', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      // Fill some fields
      const keywordsInput = screen.getByPlaceholderText('python, backend, api, django');
      const locationsInput = screen.getByPlaceholderText('Sydney, Melbourne, Remote');
      const legalCheckbox = screen.getByLabelText('I understand and accept');

      await user.type(keywordsInput, 'test keywords');
      await user.type(locationsInput, 'test locations');
      await user.click(legalCheckbox);

      expect(keywordsInput).toHaveValue('test keywords');
      expect(locationsInput).toHaveValue('test locations');
      expect(legalCheckbox).toBeChecked();

      // Reset form
      const resetButton = screen.getByRole('button', { name: /reset form/i });
      await user.click(resetButton);

      expect(keywordsInput).toHaveValue('');
      expect(locationsInput).toHaveValue('');
      expect(legalCheckbox).not.toBeChecked();
    });

    it('resets file upload state', async () => {
      const user = userEvent.setup();
      render(FrontendFormPage);

      // Upload a file
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText('Choose File');
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText('✓ Uploaded: test.pdf')).toBeInTheDocument();
      });

      // Reset form
      const resetButton = screen.getByRole('button', { name: /reset form/i });
      await user.click(resetButton);

      expect(screen.queryByText('✓ Uploaded: test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('disables submit button while submitting', async () => {
      const user = userEvent.setup();
      
      // Mock slow API call
      mockInvoke.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(FrontendFormPage);

      const keywordsInput = screen.getByPlaceholderText('python, backend, api, django');
      await user.type(keywordsInput, 'test');

      const legalCheckbox = screen.getByLabelText('I understand and accept');
      await user.click(legalCheckbox);

      const submitButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Industry and Work Rights Options', () => {
    it('renders all industry options', async () => {
      render(FrontendFormPage);

      const industrySelect = screen.getByDisplayValue('Select an industry');
      expect(industrySelect).toBeInTheDocument();

      // Check a few key industries
      expect(screen.getByText('Accounting')).toBeInTheDocument();
      expect(screen.getByText('Information & Communication Technology')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('renders all work rights options', async () => {
      render(FrontendFormPage);

      // Check a few key work rights options
      expect(screen.getByText("I'm an Australian citizen")).toBeInTheDocument();
      expect(screen.getByText("I'm a permanent resident and/or NZ citizen")).toBeInTheDocument();
      expect(screen.getByText('I require sponsorship to work for a new employer (e.g. 482, 457)')).toBeInTheDocument();
    });
  });
});