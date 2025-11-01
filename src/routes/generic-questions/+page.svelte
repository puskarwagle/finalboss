<script>
  import { onMount } from 'svelte';
  import { API_URLS } from '$lib/api-config.js';

  let questionsData = null;
  let loading = true;
  let error = null;
  let saving = false;
  let editingQuestions = {};

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      const response = await fetch(API_URLS.GENERIC_QUESTIONS());
      const result = await response.json();

      if (result.success) {
        questionsData = result.data;
        // Initialize editing state
        questionsData.questions.forEach(q => {
          editingQuestions[q.id] = {
            keywords: q.match_keywords.join(', '),
            answers: q.answer.join(', ')
          };
        });
      } else {
        error = result.error;
      }
    } catch (err) {
      error = `Failed to load data: ${err.message}`;
    } finally {
      loading = false;
    }
  }

  async function saveQuestion(questionId) {
    try {
      saving = true;
      const edited = editingQuestions[questionId];

      const keywords = edited.keywords.split(',').map(k => k.trim()).filter(k => k);
      const answers = edited.answers.split(',').map(a => a.trim()).filter(a => a);

      const response = await fetch(`${API_URLS.GENERIC_QUESTIONS()}/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_keywords: keywords,
          answer: answers
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
      } else {
        alert(`Failed to save: ${result.error}`);
      }
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    } finally {
      saving = false;
    }
  }

  async function deleteQuestion(questionId) {
    if (!confirm('Delete this question?')) return;

    try {
      saving = true;
      const response = await fetch(`${API_URLS.GENERIC_QUESTIONS()}/${questionId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    } finally {
      saving = false;
    }
  }

  async function addNewQuestion() {
    try {
      saving = true;
      const response = await fetch(API_URLS.GENERIC_QUESTIONS(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_keywords: [''],
          answer: ['']
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadData();
      } else {
        alert(`Failed to add: ${result.error}`);
      }
    } catch (err) {
      alert(`Error adding: ${err.message}`);
    } finally {
      saving = false;
    }
  }

  async function toggleAutoAnswer() {
    try {
      saving = true;
      const newValue = !questionsData.settings.autoAnswer;

      const response = await fetch(API_URLS.GENERIC_QUESTIONS(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'settings',
          settings: { autoAnswer: newValue }
        })
      });

      const result = await response.json();
      if (result.success) {
        questionsData.settings.autoAnswer = newValue;
      } else {
        alert(`Failed to update: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Auto-Answer Questions</title>
</svelte:head>

<div class="min-h-screen bg-base-200 p-4 md:p-8">
  <div class="max-w-5xl mx-auto">

    {#if loading}
      <div class="flex items-center justify-center py-20">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    {:else if error}
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
        <button class="btn btn-sm" on:click={loadData}>Retry</button>
      </div>
    {:else}

      <!-- Controls -->
      <div class="mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <!-- Enable/Disable Toggle -->
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium">Smart matching:</span>
          <input
            type="checkbox"
            class="toggle toggle-success"
            checked={questionsData.settings.autoAnswer}
            on:change={toggleAutoAnswer}
            disabled={saving}
          />
          <span class="text-xs {questionsData.settings.autoAnswer ? 'text-success' : 'text-base-content/50'}">
            {questionsData.settings.autoAnswer ? 'ON' : 'OFF'}
          </span>
        </div>

        <!-- Add New Button -->
        <button
          class="btn btn-primary btn-sm gap-2"
          on:click={addNewQuestion}
          disabled={saving}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New
        </button>
      </div>

      <!-- Questions List -->
      <div class="space-y-3">
        {#each questionsData.questions as question, index (question.id)}
          <div class="card bg-base-100 shadow-sm border border-base-300">
            <div class="card-body p-4">

              <!-- Question Header -->
              <div class="flex items-center gap-3 mb-3">
                <div class="badge badge-neutral">#{question.id}</div>
                <button
                  class="btn btn-ghost btn-xs ml-auto"
                  on:click={() => deleteQuestion(question.id)}
                  disabled={saving}
                  aria-label="Delete question"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <!-- Keywords Input -->
                <div class="form-control">
                  <label class="label py-1" for={`keywords-${question.id}`}>
                    <span class="label-text font-medium">🔍 For the questions</span>
                  </label>
                  <input
                    id={`keywords-${question.id}`}
                    type="text"
                    class="input input-bordered w-full"
                    placeholder='right to work, work authorization, visa status'
                    bind:value={editingQuestions[question.id].keywords}
                    on:blur={() => saveQuestion(question.id)}
                  />
                </div>

                <!-- Answer Input -->
                <div class="form-control">
                  <label class="label py-1" for={`answers-${question.id}`}>
                    <span class="label-text font-medium">✅ Answer with</span>
                  </label>
                  <input
                    id={`answers-${question.id}`}
                    type="text"
                    class="input input-bordered w-full"
                    placeholder='Australian citizen, Yes, I have work rights'
                    bind:value={editingQuestions[question.id].answers}
                    on:blur={() => saveQuestion(question.id)}
                  />
                </div>
              </div>

              {#if index === 0}
                <!-- Demo Info - Only show on first card -->
                <details class="collapse collapse-arrow bg-base-200 mt-2">
                  <summary class="collapse-title text-xs font-medium py-2 min-h-0">
                    See current values
                  </summary>
                  <div class="collapse-content text-xs">
                    <div class="space-y-1">
                      <div>
                        <span class="font-semibold">Matches:</span>
                        <div class="flex flex-wrap gap-1 mt-1">
                          {#each question.match_keywords as keyword}
                            <span class="badge badge-xs badge-ghost">{keyword}</span>
                          {/each}
                        </div>
                      </div>
                      <div>
                        <span class="font-semibold">Answers:</span>
                        <div class="flex flex-wrap gap-1 mt-1">
                          {#each question.answer as ans}
                            <span class="badge badge-xs badge-primary">{ans}</span>
                          {/each}
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              {/if}

            </div>
          </div>
        {/each}
      </div>

    {/if}
  </div>
</div>
