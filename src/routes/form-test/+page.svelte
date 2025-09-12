<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from "@tauri-apps/api/core"

  let testResults = $state([]);
  let isRunningTests = $state(false);
  let testProgress = $state(0);
  let totalTests = 8;

  const sampleFormData = {
    keywords: 'python, backend, api, django',
    locations: 'Sydney, Melbourne, Remote',
    minSalary: '80000',
    maxSalary: '150000',
    jobType: 'full-time',
    experienceLevel: 'mid',
    industry: '18_information',
    listedDate: 'last_7_days',
    remotePreference: 'hybrid',
    rightToWork: 'citizen',
    rewriteResume: true,
    excludedCompanies: 'wipro, infosys',
    excludedKeywords: 'junior, intern',
    skillWeight: '0.4',
    locationWeight: '0.2',
    salaryWeight: '0.3',
    companyWeight: '0.1',
    enableDeepSeek: true,
    deepSeekApiKey: 'sk-test-key-12345',
    acceptTerms: true
  };

  function addTestResult(testName: string, passed: boolean, details: string, error?: any) {
    testResults.push({
      name: testName,
      passed,
      details,
      error: error ? error.toString() : null,
      timestamp: new Date().toISOString()
    });
    testResults = testResults; // Trigger reactivity
    testProgress++;
  }

  async function runAllTests() {
    isRunningTests = true;
    testResults = [];
    testProgress = 0;

    await runTest1_DirectoryCreation();
    await runTest2_FileWrite();
    await runTest3_FileRead();
    await runTest4_ConfigSave();
    await runTest5_ConfigLoad();
    await runTest6_FormDataIntegrity();
    await runTest7_ErrorHandling();
    await runTest8_FileOperations();

    isRunningTests = false;
  }

  // Test 1: Directory Creation
  async function runTest1_DirectoryCreation() {
    try {
      const result = await invoke<string>("create_directory_async", { 
        dirname: "src/bots/test" 
      });
      addTestResult("Directory Creation", true, `Successfully created test directory: ${result}`);
    } catch (error) {
      addTestResult("Directory Creation", false, "Failed to create directory", error);
    }
  }

  // Test 2: File Write
  async function runTest2_FileWrite() {
    try {
      const testContent = JSON.stringify({ test: "data", timestamp: Date.now() }, null, 2);
      const result = await invoke<string>("write_file_async", { 
        filename: "src/bots/test/write-test.json",
        content: testContent
      });
      addTestResult("File Write", true, `File write successful: ${result}`);
    } catch (error) {
      addTestResult("File Write", false, "Failed to write file", error);
    }
  }

  // Test 3: File Read
  async function runTest3_FileRead() {
    try {
      const content = await invoke<string>("read_file_async", { 
        filename: "src/bots/test/write-test.json" 
      });
      const parsed = JSON.parse(content);
      const isValid = parsed.test === "data" && typeof parsed.timestamp === "number";
      addTestResult("File Read", isValid, `Read file successfully. Content valid: ${isValid}`, null);
    } catch (error) {
      addTestResult("File Read", false, "Failed to read file", error);
    }
  }

  // Test 4: Config Save (Form Data)
  async function runTest4_ConfigSave() {
    try {
      await invoke<string>("create_directory_async", { 
        dirname: "src/bots" 
      }).catch(() => {}); // Ignore if exists

      const config = {
        formData: sampleFormData,
        industries: [],
        workRightOptions: []
      };

      const result = await invoke<string>("write_file_async", { 
        filename: "src/bots/test-config.json",
        content: JSON.stringify(config, null, 2)
      });
      
      addTestResult("Config Save", true, `Config saved successfully: ${result}`);
    } catch (error) {
      addTestResult("Config Save", false, "Failed to save config", error);
    }
  }

  // Test 5: Config Load
  async function runTest5_ConfigLoad() {
    try {
      const configContent = await invoke<string>("read_file_async", { 
        filename: "src/bots/test-config.json" 
      });
      const config = JSON.parse(configContent);
      
      const isValid = config.formData && 
                     config.formData.keywords === sampleFormData.keywords &&
                     config.formData.locations === sampleFormData.locations;
      
      addTestResult("Config Load", isValid, `Config loaded and validated: ${isValid}`);
    } catch (error) {
      addTestResult("Config Load", false, "Failed to load config", error);
    }
  }

  // Test 6: Form Data Integrity
  async function runTest6_FormDataIntegrity() {
    try {
      // Save complex form data
      const complexConfig = {
        formData: {
          ...sampleFormData,
          specialChars: "test with 'quotes' and \"double quotes\" and symbols: !@#$%^&*()",
          unicode: "Testing unicode: 🚀 🧪 ⚡ 🎯",
          multiline: "Line 1\nLine 2\nLine 3"
        }
      };

      await invoke<string>("write_file_async", { 
        filename: "src/bots/integrity-test.json",
        content: JSON.stringify(complexConfig, null, 2)
      });

      const loadedContent = await invoke<string>("read_file_async", { 
        filename: "src/bots/integrity-test.json" 
      });
      const loadedConfig = JSON.parse(loadedContent);

      const integrityCheck = 
        loadedConfig.formData.specialChars === complexConfig.formData.specialChars &&
        loadedConfig.formData.unicode === complexConfig.formData.unicode &&
        loadedConfig.formData.multiline === complexConfig.formData.multiline;

      addTestResult("Form Data Integrity", integrityCheck, `Data integrity preserved: ${integrityCheck}`);
    } catch (error) {
      addTestResult("Form Data Integrity", false, "Failed integrity test", error);
    }
  }

  // Test 7: Error Handling
  async function runTest7_ErrorHandling() {
    try {
      // Try to read a non-existent file
      await invoke<string>("read_file_async", { 
        filename: "src/bots/nonexistent-file.json" 
      });
      addTestResult("Error Handling", false, "Should have thrown an error for non-existent file");
    } catch (error) {
      const errorString = error.toString();
      const isExpectedError = errorString.includes("Failed to read file") || errorString.includes("No such file");
      addTestResult("Error Handling", isExpectedError, `Proper error handling: ${errorString}`);
    }
  }

  // Test 8: File Operations (Copy, Rename, Delete)
  async function runTest8_FileOperations() {
    try {
      // Create test file
      await invoke<string>("write_file_async", { 
        filename: "src/bots/test/operations-test.txt",
        content: "Test file for operations"
      });

      // Copy file
      await invoke<string>("copy_file_async", { 
        source: "src/bots/test/operations-test.txt",
        destination: "src/bots/test/operations-test-copy.txt"
      });

      // Check if copy exists
      const exists = await invoke<boolean>("file_exists_async", { 
        filename: "src/bots/test/operations-test-copy.txt" 
      });

      // Get metadata
      const metadata = await invoke<string>("get_file_metadata_async", { 
        filename: "src/bots/test/operations-test.txt" 
      });

      const allOperationsWork = exists && metadata.includes("Size:");
      addTestResult("File Operations", allOperationsWork, `Copy: ${exists}, Metadata: ${metadata.length > 0}`);
    } catch (error) {
      addTestResult("File Operations", false, "File operations failed", error);
    }
  }

  // Cleanup test files
  async function cleanupTests() {
    try {
      const filesToDelete = [
        "src/bots/test/write-test.json",
        "src/bots/test/operations-test.txt",
        "src/bots/test/operations-test-copy.txt",
        "src/bots/test-config.json",
        "src/bots/integrity-test.json"
      ];

      for (const file of filesToDelete) {
        try {
          await invoke<string>("delete_file_async", { filename: file });
        } catch (e) {
          // Ignore deletion errors
        }
      }

      // Remove test directory
      try {
        await invoke<string>("remove_directory_async", { dirname: "src/bots/test" });
      } catch (e) {
        // Ignore if directory doesn't exist or isn't empty
      }

      alert("Test cleanup completed");
    } catch (error) {
      alert(`Cleanup error: ${error}`);
    }
  }

  function getTestSummary() {
    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;
    return { passed, failed, total: testResults.length };
  }
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

  .test-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    padding-top: 8rem;
    font-family: 'Orbitron', monospace;
    color: #00ff00;
    min-height: 100vh;
    background: #000;
  }

  .test-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .test-title {
    font-size: 3rem;
    font-weight: 900;
    color: #00ff00;
    text-shadow: 0 0 20px #00ff0050;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin-bottom: 1rem;
  }

  .test-subtitle {
    font-size: 1.2rem;
    color: #00ffff;
    margin-bottom: 2rem;
  }

  .test-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 3rem;
  }

  .test-btn {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    border: none;
    border-radius: 8px;
    padding: 1rem 2rem;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .test-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 255, 255, 0.4);
  }

  .test-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .cleanup-btn {
    background: linear-gradient(45deg, #ff6600, #ff9900);
  }

  .progress-bar {
    width: 100%;
    height: 20px;
    background: #001100;
    border: 1px solid #00ff00;
    border-radius: 10px;
    margin-bottom: 2rem;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #00ff00, #00ffff);
    transition: width 0.3s ease;
  }

  .progress-text {
    text-align: center;
    margin-top: 0.5rem;
    font-weight: 700;
  }

  .test-summary {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .summary-card {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .summary-number {
    font-size: 2rem;
    font-weight: 900;
    color: #00ffff;
  }

  .summary-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .test-results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .test-result {
    background: linear-gradient(135deg, #001100, #003300);
    border-left: 4px solid;
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .test-result.passed {
    border-left-color: #00ff00;
  }

  .test-result.failed {
    border-left-color: #ff0000;
  }

  .test-result:hover {
    transform: translateX(5px);
    box-shadow: 0 5px 15px rgba(0, 255, 0, 0.2);
  }

  .test-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: #00ffff;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .test-status {
    font-size: 1rem;
    font-weight: 900;
  }

  .test-status.passed {
    color: #00ff00;
  }

  .test-status.failed {
    color: #ff0000;
  }

  .test-details {
    color: #00cc00;
    margin-bottom: 0.5rem;
    word-break: break-all;
  }

  .test-error {
    color: #ff6600;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    background: rgba(255, 0, 0, 0.1);
    padding: 0.5rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  .test-timestamp {
    color: #666;
    font-size: 0.8rem;
    text-align: right;
  }
</style>

<div class="test-container">
  <div class="test-header">
    <h1 class="test-title">🧪 Form Test Suite</h1>
    <p class="test-subtitle">Comprehensive testing for the configuration form's tokio fs operations</p>
  </div>

  <div class="test-controls">
    <button 
      class="test-btn" 
      onclick={runAllTests}
      disabled={isRunningTests}
    >
      {isRunningTests ? 'Running Tests...' : '🚀 Run All Tests'}
    </button>
    
    <button 
      class="test-btn cleanup-btn" 
      onclick={cleanupTests}
      disabled={isRunningTests}
    >
      🧹 Cleanup Test Files
    </button>
  </div>

  {#if isRunningTests || testResults.length > 0}
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        style="width: {(testProgress / totalTests) * 100}%"
      ></div>
    </div>
    <div class="progress-text">
      Progress: {testProgress} / {totalTests} tests completed
    </div>
  {/if}

  {#if testResults.length > 0}
    <div class="test-summary">
      <div class="summary-card">
        <div class="summary-number">{getTestSummary().passed}</div>
        <div class="summary-label">Passed</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">{getTestSummary().failed}</div>
        <div class="summary-label">Failed</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">{getTestSummary().total}</div>
        <div class="summary-label">Total</div>
      </div>
    </div>

    <div class="test-results">
      {#each testResults as result}
        <div class="test-result {result.passed ? 'passed' : 'failed'}">
          <div class="test-name">
            <span>{result.name}</span>
            <span class="test-status {result.passed ? 'passed' : 'failed'}">
              {result.passed ? '✅ PASS' : '❌ FAIL'}
            </span>
          </div>
          <div class="test-details">{result.details}</div>
          {#if result.error}
            <div class="test-error">Error: {result.error}</div>
          {/if}
          <div class="test-timestamp">{new Date(result.timestamp).toLocaleString()}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>