<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { API_URLS } from '$lib/api-config.js';

  let questionsData = null;
  let stats = null;
  let loading = true;
  let error = null;
  let saving = false;
  let activeTab = 'questions';

  // Reactive state for settings
  let settings = {
    autoAnswerEnabled: true,
    requireConfirmation: false,
    skipAIForGeneric: true,
    logAnswers: true
  };

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;

      // Load questions and stats in parallel
      const [questionsResponse, statsResponse] = await Promise.all([
        fetch(API_URLS.GENERIC_QUESTIONS()),
        fetch(API_URLS.GENERIC_QUESTIONS_STATS())
      ]);

      const questionsResult = await questionsResponse.json();
      const statsResult = await statsResponse.json();

      if (questionsResult.success) {
        questionsData = questionsResult.data;
        settings = { ...questionsResult.data.settings };
      }

      if (statsResult.success) {
        stats = statsResult.data;
      }

      if (!questionsResult.success) {
        error = questionsResult.error;
      }
    } catch (err) {
      error = `Failed to load data: ${err.message}`;
    } finally {
      loading = false;
    }
  }

  async function updateQuestionAnswer(questionId, newAnswer) {
    try {
      saving = true;

      const response = await fetch(`${API_URLS.GENERIC_QUESTIONS()}/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer: newAnswer })
      });

      const result = await response.json();

      if (result.success) {
        // Update local data
        const question = questionsData.questions.find(q => q.id === questionId);
        if (question) {
          question.currentAnswer = newAnswer;
        }
      } else {
        alert(`Failed to update answer: ${result.error}`);
      }
    } catch (err) {
      alert(`Error updating answer: ${err.message}`);
    } finally {
      saving = false;
    }
  }

  async function updateSettings() {
    try {
      saving = true;

      const response = await fetch(API_URLS.GENERIC_QUESTIONS(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'settings',
          settings: settings
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Settings updated successfully!');
        questionsData.settings = { ...settings };
      } else {
        alert(`Failed to update settings: ${result.error}`);
      }
    } catch (err) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      saving = false;
    }
  }

  function getQuestionTypeDisplay(type) {
    const types = {
      select: 'Single Choice',
      checkbox: 'Multiple Choice',
      text: 'Text Input',
      textarea: 'Long Text',
      number: 'Number',
      date: 'Date'
    };
    return types[type] || type;
  }

  function getFrequencyLabel(frequency) {
    if (frequency >= 8) return { label: 'Very Common', color: 'bg-red-100 text-red-800' };
    if (frequency >= 5) return { label: 'Common', color: 'bg-orange-100 text-orange-800' };
    if (frequency >= 2) return { label: 'Occasional', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Rare', color: 'bg-gray-100 text-gray-800' };
  }
</script>

<svelte:head>
  <title>Generic Questions Configuration</title>
</svelte:head>

<div class="min-h-screen bg-base-200 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h1 class="card-title text-3xl">❓ Generic Questions Configuration</h1>
        <p class="text-base-content/70">
          Configure automatic answers for common employer screening questions. These answers will be used
          instead of AI when similar questions are detected during job applications.
        </p>

        <!-- Tab Navigation -->
        <div class="tabs tabs-boxed mt-4">
          <button
            class="tab {activeTab === 'questions' ? 'tab-active' : ''}"
            on:click={() => activeTab = 'questions'}
          >
            📝 Questions ({questionsData?.questions?.length || 0})
          </button>
          <button
            class="tab {activeTab === 'settings' ? 'tab-active' : ''}"
            on:click={() => activeTab = 'settings'}
          >
            ⚙️ Settings
          </button>
          <button
            class="tab {activeTab === 'stats' ? 'tab-active' : ''}"
            on:click={() => activeTab = 'stats'}
          >
            📊 Statistics
          </button>
        </div>
      </div>
    </div>

    {#if loading}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="mt-4">Loading configuration...</p>
        </div>
      </div>
    {:else if error}
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="font-bold">Error loading configuration</h3>
          <div class="text-xs">{error}</div>
        </div>
        <button class="btn btn-sm btn-outline" on:click={loadData}>Retry</button>
      </div>
    {:else}
      <!-- Questions Tab -->
      {#if activeTab === 'questions'}
        <div class="space-y-6">
          {#each questionsData.questions as question (question.id)}
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3 class="card-title text-xl">{question.description}</h3>
                    <p class="text-sm opacity-60 mt-1">ID: {question.id}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="badge {question.frequency >= 8 ? 'badge-error' :
                                     question.frequency >= 5 ? 'badge-warning' :
                                     question.frequency >= 2 ? 'badge-info' : 'badge-neutral'}">
                      {getFrequencyLabel(question.frequency).label} ({question.frequency})
                    </div>
                    <div class="badge badge-primary">
                      {getQuestionTypeDisplay(question.questionType)}
                    </div>
                  </div>
                </div>

                <!-- Question Patterns -->
                <div class="mb-6">
                  <h4 class="font-semibold mb-3">🔍 Detection Patterns:</h4>
                  <div class="flex flex-wrap gap-2">
                    {#each question.patterns as pattern}
                      <div class="badge badge-outline badge-sm font-mono">
                        {pattern}
                      </div>
                    {/each}
                  </div>
                </div>

                <!-- Answer Configuration -->
                <div class="divider">Answer Configuration</div>

                {#if question.questionType === 'select'}
                  <div class="space-y-4">
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">✨ Preferred Options (in priority order):</span>
                      </label>
                      <div class="space-y-2">
                        {#each question.currentAnswer.preferredOptions || [] as option, i}
                          <div class="join w-full">
                            <div class="join-item flex items-center justify-center bg-base-200 px-3 min-w-[2rem]">
                              <span class="text-sm font-semibold">{i + 1}</span>
                            </div>
                            <input
                              type="text"
                              class="input input-bordered join-item flex-1"
                              bind:value={option}
                              on:change={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                              placeholder="e.g. Australian citizen"
                            />
                          </div>
                        {/each}
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-4">
                      <label class="label cursor-pointer">
                        <input
                          type="checkbox"
                          class="checkbox checkbox-primary"
                          bind:checked={question.currentAnswer.fallbackToLast}
                          on:change={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                        />
                        <span class="label-text ml-2">Fallback to last option</span>
                      </label>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">Fallback index:</span>
                        </label>
                        <input
                          type="number"
                          class="input input-bordered input-sm w-20"
                          bind:value={question.currentAnswer.fallbackIndex}
                          min="0"
                          on:change={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                        />
                      </div>
                    </div>
                  </div>

                {:else if question.questionType === 'checkbox'}
                  <div class="space-y-4">
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">💻 Preferred Technologies/Languages:</span>
                      </label>
                      <textarea
                        class="textarea textarea-bordered h-24"
                        placeholder="Enter comma-separated values (e.g., react, javascript, python)"
                        value={(question.currentAnswer.preferredTechnologies || question.currentAnswer.preferredLanguages || []).join(', ')}
                        on:input={(e) => {
                          const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                          if (question.currentAnswer.preferredTechnologies) {
                            question.currentAnswer.preferredTechnologies = values;
                          } else {
                            question.currentAnswer.preferredLanguages = values;
                          }
                        }}
                        on:blur={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                      ></textarea>
                    </div>

                    <div class="form-control w-fit">
                      <label class="label">
                        <span class="label-text">Max selections:</span>
                      </label>
                      <input
                        type="number"
                        class="input input-bordered input-sm w-24"
                        bind:value={question.currentAnswer.maxSelections}
                        min="1"
                        max="20"
                        on:change={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                      />
                    </div>
                  </div>

                {:else if question.questionType === 'text' || question.questionType === 'textarea'}
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">📝 Text Answer:</span>
                    </label>
                    <textarea
                      class="textarea textarea-bordered h-24"
                      value={question.currentAnswer.textValue || question.currentAnswer.customText || ''}
                      on:input={(e) => {
                        if (question.currentAnswer.textValue !== undefined) {
                          question.currentAnswer.textValue = e.target.value;
                        } else {
                          question.currentAnswer.customText = e.target.value;
                        }
                      }}
                      on:blur={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                      placeholder="Enter your standard answer for this type of question"
                    ></textarea>
                  </div>

                {:else if question.questionType === 'number'}
                  <div class="form-control w-fit">
                    <label class="label">
                      <span class="label-text">🔢 Numeric Answer:</span>
                    </label>
                    <input
                      type="number"
                      class="input input-bordered w-32"
                      bind:value={question.currentAnswer.numericValue}
                      on:change={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                    />
                  </div>
                {/if}

                <!-- Notes -->
                <div class="form-control mt-6">
                  <label class="label">
                    <span class="label-text">📋 Notes:</span>
                  </label>
                  <textarea
                    class="textarea textarea-bordered textarea-sm h-16"
                    bind:value={question.currentAnswer.notes}
                    on:change={() => updateQuestionAnswer(question.id, question.currentAnswer)}
                    placeholder="Add notes about this question or answer..."
                  ></textarea>
                </div>
              </div>
            </div>
          {/each}
        </div>

      <!-- Settings Tab -->
      {:else if activeTab === 'settings'}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title text-2xl mb-6">⚙️ Global Settings</h2>

            <div class="space-y-6">
              <div class="form-control">
                <label class="label cursor-pointer">
                  <div>
                    <span class="label-text text-base font-semibold">🚀 Enable Auto-Answer</span>
                    <p class="text-sm opacity-70">Automatically answer generic questions during job applications</p>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-primary"
                    bind:checked={settings.autoAnswerEnabled}
                  />
                </label>
              </div>

              <div class="divider"></div>

              <div class="form-control">
                <label class="label cursor-pointer">
                  <div>
                    <span class="label-text text-base font-semibold">⚠️ Require Confirmation</span>
                    <p class="text-sm opacity-70">Show confirmation dialog before answering questions</p>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-warning"
                    bind:checked={settings.requireConfirmation}
                  />
                </label>
              </div>

              <div class="divider"></div>

              <div class="form-control">
                <label class="label cursor-pointer">
                  <div>
                    <span class="label-text text-base font-semibold">🎯 Skip AI for Generic Questions</span>
                    <p class="text-sm opacity-70">Use generic answers instead of AI for matching questions</p>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-success"
                    bind:checked={settings.skipAIForGeneric}
                  />
                </label>
              </div>

              <div class="divider"></div>

              <div class="form-control">
                <label class="label cursor-pointer">
                  <div>
                    <span class="label-text text-base font-semibold">📝 Log Answers</span>
                    <p class="text-sm opacity-70">Log all answers to console for debugging</p>
                  </div>
                  <input
                    type="checkbox"
                    class="toggle toggle-info"
                    bind:checked={settings.logAnswers}
                  />
                </label>
              </div>
            </div>

            <div class="card-actions justify-end mt-8">
              <button
                class="btn btn-primary {saving ? 'loading' : ''}"
                on:click={updateSettings}
                disabled={saving}
              >
                {#if saving}
                  <span class="loading loading-spinner"></span>
                  Saving...
                {:else}
                  💾 Save Settings
                {/if}
              </button>
            </div>
          </div>
        </div>

      <!-- Statistics Tab -->
      {:else if activeTab === 'stats'}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Stats Cards -->
          <div class="stats shadow-xl">
            <div class="stat">
              <div class="stat-figure text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="stat-title">Total Questions</div>
              <div class="stat-value text-primary">{stats.totalQuestions}</div>
              <div class="stat-desc">Generic questions configured</div>
            </div>
          </div>

          <div class="stats shadow-xl">
            <div class="stat">
              <div class="stat-figure text-{stats.autoAnswerEnabled ? 'success' : 'error'}">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div class="stat-title">Auto-Answer Status</div>
              <div class="stat-value text-{stats.autoAnswerEnabled ? 'success' : 'error'}">
                {stats.autoAnswerEnabled ? 'ON' : 'OFF'}
              </div>
              <div class="stat-desc">Automatic answering</div>
            </div>
          </div>

          <div class="stats shadow-xl">
            <div class="stat">
              <div class="stat-figure text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="stat-title">Total Usage</div>
              <div class="stat-value text-secondary">{stats.totalFrequency}</div>
              <div class="stat-desc">Times questions appeared in jobs</div>
            </div>
          </div>

          <!-- Question Types Card -->
          <div class="card bg-base-100 shadow-xl md:col-span-2 lg:col-span-3">
            <div class="card-body">
              <h3 class="card-title text-xl mb-4">📊 Question Types</h3>
              <div class="stats stats-vertical lg:stats-horizontal shadow">
                {#each Object.entries(stats.questionTypes) as [type, count]}
                  <div class="stat">
                    <div class="stat-title">{getQuestionTypeDisplay(type)}</div>
                    <div class="stat-value text-accent">{count}</div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Most Frequent Question -->
          {#if stats.mostFrequentQuestion}
            <div class="card bg-base-100 shadow-xl md:col-span-2 lg:col-span-3">
              <div class="card-body">
                <h3 class="card-title text-xl mb-4">🏆 Most Common Question</h3>
                <div class="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h4 class="font-bold">{stats.mostFrequentQuestion.description}</h4>
                    <div class="text-xs">
                      Appears in {stats.mostFrequentQuestion.frequency} out of 12 analyzed job postings
                      ({Math.round((stats.mostFrequentQuestion.frequency / 12) * 100)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>

