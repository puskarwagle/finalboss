<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from "@tauri-apps/api/core"
  
  let formData = {
    keywords: '',
    locations: '',
    minSalary: '',
    maxSalary: '',
    jobType: 'any',
    experienceLevel: 'any',
    industry: '',
    listedDate: '',
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

  let isAdvancedMode = false;
  let showSmartMatching = false;
  let showDeepSeek = false;
  let isSubmitting = false;
  let resumeFile = null;
  let resumeUploaded = false;

  onMount(() => {
    loadConfig();
  });

  const industries = [
    { value: '', label: 'Select an industry' },
    { value: '1_accounting', label: 'Accounting' },
    { value: '2_administration', label: 'Administration & Office Support' },
    { value: '3_advertising', label: 'Advertising, Arts & Media' },
    { value: '4_banking', label: 'Banking & Financial Services' },
    { value: '5_call', label: 'Call Centre & Customer Service' },
    { value: '6_ceo', label: 'CEO & General Management' },
    { value: '7_community', label: 'Community Services & Development' },
    { value: '8_construction', label: 'Construction' },
    { value: '9_consulting', label: 'Consulting & Strategy' },
    { value: '10_design', label: 'Design & Architecture' },
    { value: '11_education', label: 'Education & Training' },
    { value: '12_engineering', label: 'Engineering' },
    { value: '13_farming', label: 'Farming, Animals & Conservation' },
    { value: '14_government', label: 'Government & Defence' },
    { value: '15_healthcare', label: 'Healthcare & Medical' },
    { value: '16_hospitality', label: 'Hospitality & Tourism' },
    { value: '17_human', label: 'Human Resources & Recruitment' },
    { value: '18_information', label: 'Information & Communication Technology' },
    { value: '19_insurance', label: 'Insurance & Superannuation' },
    { value: '20_legal', label: 'Legal' },
    { value: '21_manufacturing', label: 'Manufacturing, Transport & Logistics' },
    { value: '22_marketing', label: 'Marketing & Communications' },
    { value: '23_mining', label: 'Mining, Resources & Energy' },
    { value: '24_real', label: 'Real Estate & Property' },
    { value: '25_retail', label: 'Retail & Consumer Products' },
    { value: '26_sales', label: 'Sales' },
    { value: '27_science', label: 'Science & Technology' },
    { value: '28_self_employment', label: 'Self Employment' },
    { value: '29_sport', label: 'Sport & Recreation' },
    { value: '30_trades', label: 'Trades & Services' }
  ];

  const workRightOptions = [
    { value: 'citizen', label: "I'm an Australian citizen" },
    { value: 'permanent_resident', label: "I'm a permanent resident and/or NZ citizen" },
    { value: 'partner_visa', label: 'I have a family/partner visa with no restrictions' },
    { value: 'graduate_visa', label: 'I have a graduate temporary work visa' },
    { value: 'holiday_visa', label: 'I have a holiday temporary work visa' },
    { value: 'regional_visa', label: 'I have a temporary visa with restrictions on work location (e.g. skilled regional visa 491)' },
    { value: 'protection_visa', label: 'I have a temporary protection or safe haven enterprise work visa' },
    { value: 'doctoral_visa', label: 'I have a temporary visa with no restrictions (e.g. doctoral student)' },
    { value: 'hour_restricted_visa', label: 'I have a temporary visa with restrictions on work hours (e.g. student visa, retirement visa)' },
    { value: 'industry_restricted_visa', label: 'I have a temporary visa with restrictions on industry (e.g. temporary activity visa 408)' },
    { value: 'sponsorship_required', label: 'I require sponsorship to work for a new employer (e.g. 482, 457)' }
  ];

  function toggleAdvancedMode() {
    isAdvancedMode = !isAdvancedMode;
  }

  function toggleSmartMatching() {
    showSmartMatching = !showSmartMatching;
  }

  function toggleDeepSeek() {
    showDeepSeek = !showDeepSeek;
  }

  function handleToggleKeydown(event, toggleFunction) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFunction();
    }
  }

  function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (file) {
      resumeFile = file;
      resumeUploaded = true;
    }
  }

  function resetForm() {
    formData = {
      keywords: '',
      locations: '',
      minSalary: '',
      maxSalary: '',
      jobType: 'any',
      experienceLevel: 'any',
      industry: '',
      listedDate: '',
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
    resumeFile = null;
    resumeUploaded = false;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    
    console.log('Form data at submit:', formData);
    
    if (!formData.keywords.trim()) {
      alert('Keywords are required');
      return;
    }

    if (!formData.acceptTerms) {
      alert('You must accept the legal disclaimer to continue');
      return;
    }

    isSubmitting = true;
    
    try {
      console.log('Saving form data:', formData);
      const saved = await saveConfig();
      if (saved) {
        console.log('Form submitted successfully:', formData);
        alert('Configuration saved successfully!');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }

  function validateWeight(event) {
    const value = parseFloat(event.target.value);
    if (value < 0 || value > 1) {
      event.target.value = Math.max(0, Math.min(1, value));
    }
  }

  async function loadConfig() {
    try {
      console.log('Loading config from project bots directory');
      const configContent = await invoke<string>("read_file_async", { 
        filename: "src/bots/user-bots-config.json" 
      });
      const config = JSON.parse(configContent);
      if (config.formData) {
        formData = { ...formData, ...config.formData };
      }
      console.log('Config loaded from project file');
    } catch (error) {
      console.log('No existing config found, using defaults');
    }
  }

  async function saveConfig() {
    try {
      console.log('Saving config to project bots directory');
      
      // First create the directory if it doesn't exist
      await invoke<string>("create_directory_async", { 
        dirname: "src/bots" 
      }).catch(() => {}); // Ignore error if directory already exists
      
      let config;
      try {
        const configContent = await invoke<string>("read_file_async", { 
          filename: "src/bots/user-bots-config.json" 
        });
        config = JSON.parse(configContent);
      } catch {
        config = { formData: {}, industries: [], workRightOptions: [] };
      }

      config.formData = formData;
      
      await invoke<string>("write_file_async", { 
        filename: "src/bots/user-bots-config.json",
        content: JSON.stringify(config, null, 2)
      });
      console.log('Config saved to project file');
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }
</script>

<div class="configuration-form">
  <div class="form-container">
    <div class="form-header">
      <h2>⚙️ Configuration</h2>
      <div class="header-controls">
        <button type="button" class="advanced-toggle" onclick={toggleAdvancedMode}>
          🔧 {isAdvancedMode ? 'Basic' : 'Advanced'}
        </button>
      </div>
    </div>

    <form onsubmit={handleSubmit} class="config-form">
      <!-- Job Preferences -->
      <div class="form-section">
        <div class="section-header">🎯 Job Preferences</div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Keywords (comma separated)</span>
                <span class="required-indicator">Required</span>
                <input 
                  type="text" 
                  placeholder="python, backend, api, django" 
                  bind:value={formData.keywords}
                  class="form-input"
                  required 
                />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Locations (comma separated)</span>
                <input 
                  type="text" 
                  placeholder="Sydney, Melbourne, Remote" 
                  bind:value={formData.locations}
                  class="form-input"
                />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Minimum Salary (AUD)</span>
                <input 
                  type="number" 
                  placeholder="80000" 
                  min="0"
                  bind:value={formData.minSalary}
                  class="form-input"
                />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Maximum Salary (AUD)</span>
                <input 
                  type="number" 
                  placeholder="150000" 
                  min="0"
                  bind:value={formData.maxSalary}
                  class="form-input"
                />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Job Types</span>
                <select bind:value={formData.jobType} class="form-select">
                  <option value="any">Any</option>
                  <option value="full-time">Full time</option>
                  <option value="part-time">Part time</option>
                  <option value="contract">Contract/Temp</option>
                  <option value="casual">Casual/Vacation</option>
                </select>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Experience Levels</span>
                <select bind:value={formData.experienceLevel} class="form-select">
                  <option value="any">Any</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                  <option value="executive">Executive</option>
                </select>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Industries</span>
                <select bind:value={formData.industry} class="form-select">
                  {#each industries as industry}
                    <option value={industry.value} disabled={industry.value === ''}>{industry.label}</option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Job Listed On</span>
                <select bind:value={formData.listedDate} class="form-select">
                  <option value="" disabled selected>Select listing date range</option>
                  <option value="any">Any time</option>
                  <option value="today">Today</option>
                  <option value="last_3_days">Last 3 days</option>
                  <option value="last_7_days">Last 7 days</option>
                  <option value="last_14_days">Last 14 days</option>
                  <option value="last_30_days">Last 30 days</option>
                </select>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Remote Preference</span>
                <select bind:value={formData.remotePreference} class="form-select">
                  <option value="any">Any</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="on-site">On-site</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Work Rights -->
      <div class="form-section">
        <div class="section-header">🏛️ Work Rights</div>
        <div class="section-content">
          <div class="work-rights-group">
            <div class="work-rights-label">
              Which of the following statements best describes your right to work in Australia?
            </div>
            <div class="work-rights-select-wrapper">
              <select bind:value={formData.rightToWork} class="form-select work-rights-select" name="right_to_work_in_aus">
                {#each workRightOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Application Settings -->
      <div class="form-section">
        <div class="section-header">🤖 Application Settings</div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <span class="checkbox-text">Rewrite resume for each Job?</span>
                <input type="checkbox" bind:checked={formData.rewriteResume} class="checkbox-input" />
                <span class="checkmark"></span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Resume Upload</span>
                <span class="helper-text">PDF format recommended</span>
                <div class="file-upload-wrapper">
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx" 
                    id="resume-upload" 
                    class="file-input"
                    onchange={handleResumeUpload}
                  />
                  <label for="resume-upload" class="file-upload-label">
                    Choose File
                  </label>
                  {#if resumeUploaded}
                    <div class="file-upload-status">
                      <span class="upload-success">✓ Uploaded: {resumeFile?.name || 'filename.pdf'}</span>
                    </div>
                  {/if}
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters & Quality Control -->
      <div class="form-section">
        <div class="section-header">🎯 Quality Filters</div>
        <div class="section-content">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Excluded Companies (comma separated)</span>
                <input 
                  type="text" 
                  placeholder="wipro, infosys, tcs" 
                  bind:value={formData.excludedCompanies}
                  class="form-input"
                />
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Excluded Keywords</span>
                <input 
                  type="text" 
                  placeholder="junior, intern, php" 
                  bind:value={formData.excludedKeywords}
                  class="form-input"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Smart Matching (Advanced) -->
      {#if isAdvancedMode}
        <div class="form-section collapsible">
          <div 
            class="section-header-collapsible" 
            role="button" 
            tabindex="0"
            onclick={toggleSmartMatching}
            onkeydown={(event) => handleToggleKeydown(event, toggleSmartMatching)}
          >
            <input type="checkbox" checked={showSmartMatching} readonly />
            <span class="section-title">🧠 Smart Matching Weights</span>
          </div>
          {#if showSmartMatching}
            <div class="section-content">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Skill Weight</span>
                    <span class="helper-text">0.0 - 1.0</span>
                    <input 
                      type="number" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      placeholder="0.4" 
                      bind:value={formData.skillWeight}
                      onblur={validateWeight}
                      class="form-input"
                    />
                  </label>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Location Weight</span>
                    <span class="helper-text">0.0 - 1.0</span>
                    <input 
                      type="number" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      placeholder="0.2" 
                      bind:value={formData.locationWeight}
                      onblur={validateWeight}
                      class="form-input"
                    />
                  </label>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Salary Weight</span>
                    <span class="helper-text">0.0 - 1.0</span>
                    <input 
                      type="number" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      placeholder="0.3" 
                      bind:value={formData.salaryWeight}
                      onblur={validateWeight}
                      class="form-input"
                    />
                  </label>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">Company Weight</span>
                    <span class="helper-text">0.0 - 1.0</span>
                    <input 
                      type="number" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      placeholder="0.1" 
                      bind:value={formData.companyWeight}
                      onblur={validateWeight}
                      class="form-input"
                    />
                  </label>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- DeepSeek API (Advanced) -->
        <div class="form-section collapsible">
          <div 
            class="section-header-collapsible" 
            role="button" 
            tabindex="0"
            onclick={toggleDeepSeek}
            onkeydown={(event) => handleToggleKeydown(event, toggleDeepSeek)}
          >
            <input type="checkbox" checked={showDeepSeek} readonly />
            <span class="section-title">🤖 DeepSeek AI Integration</span>
          </div>
          {#if showDeepSeek}
            <div class="section-content">
              <div class="form-grid">
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <span class="checkbox-text">Enable DeepSeek</span>
                    <input type="checkbox" bind:checked={formData.enableDeepSeek} class="checkbox-input" />
                    <span class="checkmark"></span>
                  </label>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span class="label-text">API Key</span>
                    <input 
                      type="password" 
                      placeholder="sk-..." 
                      bind:value={formData.deepSeekApiKey}
                      class="form-input"
                    />
                  </label>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Legal Agreement -->
      <div class="form-section legal-section">
        <div class="legal-content">
          <h3 class="legal-title">Legal Disclaimer</h3>
          <div class="legal-text">
            Using this bot may violate Seek's Terms of Service. You assume all responsibility.
          </div>
        </div>

        <div class="legal-agreement">
          <label class="checkbox-label legal-checkbox">
            <span class="checkbox-text">I understand and accept</span>
            <input type="checkbox" bind:checked={formData.acceptTerms} required class="checkbox-input" />
            <span class="checkmark"></span>
          </label>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="form-actions">
        <button type="submit" class="submit-btn" disabled={isSubmitting}>
          {#if isSubmitting}
            <span class="btn-text">Saving...</span>
          {:else}
            <span class="btn-text">💾 Save Configuration</span>
          {/if}
        </button>
        <button type="button" class="reset-btn" onclick={resetForm}>
          🔄 Reset Form
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

  :global(body) {
    background: #000;
    font-family: 'Orbitron', monospace;
    color: #00ff00;
    margin: 0;
    padding: 0;
  }

  .configuration-form {
    min-height: 100vh;
    padding: 2rem;
    padding-top: 8rem;
  }

  .form-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .form-header h2 {
    font-size: 2.5rem;
    font-weight: 900;
    color: #00ff00;
    text-shadow: 0 0 20px #00ff0050;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .advanced-toggle {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    color: #00ff00;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .advanced-toggle:hover {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .config-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .form-section:hover {
    box-shadow: 0 5px 20px rgba(0, 255, 0, 0.2);
  }

  .section-header {
    font-size: 1.3rem;
    font-weight: 700;
    color: #00ffff;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-header-collapsible {
    font-size: 1.3rem;
    font-weight: 700;
    color: #00ffff;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
  }

  .section-header-collapsible:hover .section-title {
    color: #00ff00;
  }

  .section-content {
    padding-top: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label-text {
    font-size: 0.9rem;
    font-weight: 700;
    color: #00ff00;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .helper-text {
    font-size: 0.8rem;
    color: #00cc00;
    font-style: italic;
  }

  .required-indicator {
    font-size: 0.8rem;
    color: #ff6600;
    font-weight: 700;
    text-transform: uppercase;
  }

  .form-input,
  .form-select {
    background: rgba(0, 20, 0, 0.8);
    border: 1px solid #00ff00;
    border-radius: 6px;
    padding: 0.75rem;
    color: #00ff00;
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .form-input::placeholder {
    color: rgba(0, 255, 0, 0.6);
  }

  .checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    user-select: none;
  }

  .checkbox-text {
    font-size: 1rem;
    font-weight: 700;
    color: #00ff00;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .checkbox-input {
    width: 20px;
    height: 20px;
    opacity: 0;
    position: absolute;
  }

  .checkmark {
    width: 20px;
    height: 20px;
    background: rgba(0, 20, 0, 0.8);
    border: 2px solid #00ff00;
    border-radius: 4px;
    position: relative;
    transition: all 0.3s ease;
  }

  .checkbox-input:checked ~ .checkmark {
    background: #00ff00;
    border-color: #00ff00;
  }

  .checkbox-input:checked ~ .checkmark::after {
    content: '✓';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: #000;
    font-weight: 900;
    font-size: 14px;
  }

  .work-rights-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .work-rights-label {
    font-size: 1rem;
    color: #00ff00;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .work-rights-select-wrapper {
    width: 100%;
  }

  .work-rights-select {
    width: 100%;
  }

  .file-upload-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-input {
    display: none;
  }

  .file-upload-label {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    color: #00ff00;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    display: inline-block;
  }

  .file-upload-label:hover {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .file-upload-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .upload-success {
    color: #00ffff;
    font-weight: 700;
  }

  .collapsible {
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .legal-section {
    background: linear-gradient(135deg, #110000, #330000);
    border-color: #ff6600;
  }

  .legal-content {
    margin-bottom: 1.5rem;
  }

  .legal-title {
    font-size: 1.5rem;
    color: #ff6600;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .legal-text {
    color: #cc6600;
    font-size: 1rem;
    line-height: 1.5;
  }

  .legal-agreement {
    display: flex;
    justify-content: center;
  }

  .legal-checkbox .checkmark {
    border-color: #ff6600;
  }

  .legal-checkbox .checkbox-input:checked ~ .checkmark {
    background: #ff6600;
    border-color: #ff6600;
  }

  .legal-checkbox .checkbox-text {
    color: #ff6600;
  }

  .form-actions {
    display: flex;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 2rem;
  }

  .submit-btn,
  .reset-btn {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    border: none;
    border-radius: 8px;
    padding: 1.5rem 3rem;
    font-family: 'Orbitron', monospace;
    font-size: 1.2rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 200px;
  }

  .reset-btn {
    background: linear-gradient(45deg, #666, #999);
  }

  .submit-btn:hover:not(:disabled),
  .reset-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .btn-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .configuration-form {
      padding: 1rem;
      padding-top: 6rem;
    }

    .form-header {
      flex-direction: column;
      text-align: center;
    }

    .form-header h2 {
      font-size: 2rem;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .checkbox-group {
      flex-direction: column;
      align-items: flex-start;
    }

    .work-rights-group {
      gap: 0.5rem;
    }

    .form-actions {
      flex-direction: column;
    }

    .submit-btn,
    .reset-btn {
      min-width: 100%;
      padding: 1.2rem 2rem;
    }
  }
</style>