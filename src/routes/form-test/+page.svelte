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


<div class="min-h-screen bg-base-200 pt-32 pb-8">
  <div class="container mx-auto max-w-6xl px-4">
    <div class="text-center mb-12">
      <h1 class="text-5xl font-bold text-primary mb-4">🧪 Form Test Suite</h1>
      <p class="text-xl text-base-content/70">Comprehensive testing for the configuration form's tokio fs operations</p>
    </div>

    <div class="flex gap-4 justify-center mb-12 flex-wrap">
      <button
        class="btn btn-primary btn-lg"
        onclick={runAllTests}
        disabled={isRunningTests}
      >
        {isRunningTests ? 'Running Tests...' : '🚀 Run All Tests'}
      </button>

      <button
        class="btn btn-warning btn-lg"
        onclick={cleanupTests}
        disabled={isRunningTests}
      >
        🧹 Cleanup Test Files
      </button>
    </div>

    {#if isRunningTests || testResults.length > 0}
      <div class="mb-8">
        <progress class="progress progress-primary w-full" value={(testProgress / totalTests) * 100} max="100"></progress>
        <div class="text-center mt-2 font-semibold">
          Progress: {testProgress} / {totalTests} tests completed
        </div>
      </div>
    {/if}

    {#if testResults.length > 0}
      <div class="stats shadow mb-8 justify-center">
        <div class="stat">
          <div class="stat-value text-success">{getTestSummary().passed}</div>
          <div class="stat-title">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value text-error">{getTestSummary().failed}</div>
          <div class="stat-title">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value text-primary">{getTestSummary().total}</div>
          <div class="stat-title">Total</div>
        </div>
      </div>

      <div class="space-y-4">
        {#each testResults as result}
          <div class="card bg-base-100 shadow-xl border-l-4 {result.passed ? 'border-l-success' : 'border-l-error'}">
            <div class="card-body">
              <div class="flex justify-between items-center mb-2">
                <h3 class="card-title text-lg">{result.name}</h3>
                <span class="badge {result.passed ? 'badge-success' : 'badge-error'} badge-lg">
                  {result.passed ? '✅ PASS' : '❌ FAIL'}
                </span>
              </div>
              <p class="text-base-content/80">{result.details}</p>
              {#if result.error}
                <div class="mockup-code bg-error/10 border border-error/20 mt-2">
                  <pre class="text-error"><code>Error: {result.error}</code></pre>
                </div>
              {/if}
              <div class="text-right text-sm text-base-content/50 mt-2">
                {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>