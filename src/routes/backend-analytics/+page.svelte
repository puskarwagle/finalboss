<script lang="ts">
  import { onMount } from 'svelte';
  
  let activeTab = 'jobs';
  let selectedJobs = [];
  let logLevel = 'all';
  let searchQuery = '';
  let filterType = 'all';
  let applicationFilter = 'all';
  
  const tabs = [
    { id: 'jobs', label: 'Jobs', icon: '🔍', count: 256 },
    { id: 'applied', label: 'Applied', icon: '✅', count: 88 },
    { id: 'logs', label: 'Logs', icon: '📋', count: 42 },
    { id: 'analytics', label: 'Analytics', icon: '📊', count: null }
  ];

  const mockJobs = [
    {
      id: 1,
      title: 'Senior Laravel Developer',
      company: 'TechCorp Australia',
      location: 'Melbourne, VIC',
      salary: '$95,000 - $120,000',
      posted: '2024-01-15',
      postedAgo: '2 days ago',
      match: '92%',
      tags: ['Remote', 'Featured']
    },
    {
      id: 2,
      title: 'Full Stack PHP Developer',
      company: 'StartupXYZ',
      location: 'Sydney, NSW',
      salary: '$80,000 - $100,000',
      posted: '2024-01-14',
      postedAgo: '3 days ago',
      match: '87%',
      tags: ['Urgent']
    }
  ];

  const mockApplications = [
    {
      id: 1,
      title: 'Laravel Developer',
      company: 'WebDev Co',
      location: 'Brisbane, QLD',
      appliedDate: '2024-01-10',
      appliedAgo: '1 week ago',
      status: 'Pending',
      responseTime: 'No response yet'
    }
  ];

  const mockLogs = [
    { time: '12:34:56', level: 'INFO', message: 'Job scraper started successfully' },
    { time: '12:35:02', level: 'DEBUG', message: 'Filtered 120 jobs with keyword "Laravel"' },
    { time: '12:35:10', level: 'WARNING', message: 'Job posting missing salary field' },
    { time: '12:35:20', level: 'ERROR', message: 'Failed to apply to job ID 42 due to network timeout' }
  ];

  const topCompanies = [
    { name: 'TechCorp Australia', jobs: 42, applied: 12, responseRate: '50%', avgSalary: '$105,000' },
    { name: 'StartupXYZ', jobs: 31, applied: 10, responseRate: '18%', avgSalary: '$95,000' }
  ];

  function setActiveTab(tabId: string) {
    activeTab = tabId;
  }

  function toggleJobSelection(jobId: number) {
    if (selectedJobs.includes(jobId)) {
      selectedJobs = selectedJobs.filter(id => id !== jobId);
    } else {
      selectedJobs = [...selectedJobs, jobId];
    }
  }

  function clearLogs() {
    console.log('Clearing logs...');
  }
</script>

<div class="min-h-screen bg-base-200">
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-8 flex-wrap gap-4">
      <h1 class="text-4xl font-bold text-primary">🔍 Job Tracker</h1>

      <div class="tabs tabs-boxed">
        {#each tabs as tab}
          <button
            class="tab"
            class:tab-active={activeTab === tab.id}
            onclick={() => setActiveTab(tab.id)}
          >
            <span class="mr-2">{tab.icon}</span>
            {tab.label}
            {#if tab.count !== null}
              <span class="badge badge-sm ml-2">{tab.count}</span>
            {/if}
          </button>
        {/each}
      </div>

      <div class="dropdown dropdown-end">
        <button class="btn btn-ghost" tabindex="0">
          <span>⋮</span>
        </button>
        <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
          <li><a href="#export">📤 Export Data</a></li>
          <li><a href="#clear">🗑️ Clear Tab</a></li>
          <li><a href="#refresh">🔄 Refresh All</a></li>
        </ul>
      </div>
    </div>

    {#if activeTab === 'jobs'}
      <div class="jobs-tab">
        <div class="flex gap-4 mb-8 flex-wrap">
          <div class="form-control flex-1 min-w-64">
            <label class="label" for="search-jobs-input">
              <span class="label-text font-semibold">Search Jobs</span>
            </label>
            <input id="search-jobs-input" type="text" placeholder="Search by title, company, or keywords..." bind:value={searchQuery} class="input input-bordered" />
          </div>
          <div class="form-control">
            <label class="label" for="filter-type-select">
              <span class="label-text font-semibold">Filter</span>
            </label>
            <select id="filter-type-select" bind:value={filterType} class="select select-bordered">
              <option value="all">All Jobs</option>
              <option value="today">Posted Today</option>
              <option value="week">This Week</option>
              <option value="high_salary">High Salary</option>
              <option value="remote">Remote Only</option>
            </select>
          </div>
        </div>

        <div class="stats shadow mb-8">
          <div class="stat">
            <div class="stat-title">Total Found</div>
            <div class="stat-value">256</div>
          </div>
          <div class="stat">
            <div class="stat-title">Today</div>
            <div class="stat-value">14</div>
          </div>
          <div class="stat">
            <div class="stat-title">Avg Salary</div>
            <div class="stat-value">$97,000</div>
          </div>
          <div class="stat">
            <div class="stat-title">Remote</div>
            <div class="stat-value">89</div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl mb-8">
          <div class="card-body p-0">
            <table class="table table-zebra">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>Job Details</th>
                <th>Location</th>
                <th>Salary</th>
                <th>Posted</th>
                <th>Match</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each mockJobs as job}
                <tr>
                  <td>
                    <input type="checkbox" checked={selectedJobs.includes(job.id)} onchange={() => toggleJobSelection(job.id)} class="checkbox" />
                  </td>
                  <td>
                    <div class="font-bold text-primary">{job.title}</div>
                    <div class="text-sm text-base-content/70">{job.company}</div>
                    <div class="flex gap-1 flex-wrap mt-1">
                      {#each job.tags as tag}
                        <span class="badge badge-accent badge-sm">{tag}</span>
                      {/each}
                    </div>
                  </td>
                  <td><div class="text-sm">{job.location}</div></td>
                  <td><div class="font-semibold">{job.salary}</div></td>
                  <td>
                    <div class="text-sm">{job.posted}</div>
                    <div class="text-xs text-base-content/50">{job.postedAgo}</div>
                  </td>
                  <td><div class="font-bold text-success text-lg">{job.match}</div></td>
                  <td>
                    <div class="dropdown dropdown-end">
                      <button class="btn btn-ghost btn-sm" tabindex="0">⋮</button>
                      <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li><a href="#view">👁️ View Details</a></li>
                        <li><a href="#apply">✉️ Apply</a></li>
                        <li><a href="#blacklist">❌ Blacklist</a></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
            </table>
          </div>

          <div class="card-actions justify-center p-4">
            <button class="btn btn-primary">
              Load More Jobs (200+ remaining)
            </button>
          </div>
        </div>

        <div class="flex gap-4 justify-center flex-wrap">
          <button class="btn btn-primary">
            <span>✉️</span>
            Apply to {selectedJobs.length} Jobs
          </button>
          <button class="btn btn-error">
            <span>❌</span>
            Blacklist Selected
          </button>
        </div>
      </div>
    {:else if activeTab === 'applied'}
      <div class="applied-tab">
        <div class="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h3 class="text-2xl font-bold text-primary">Application History</h3>
          <select bind:value={applicationFilter} class="select select-bordered">
            <option value="all">All Applications</option>
            <option value="pending">Pending Response</option>
            <option value="replied">Company Replied</option>
            <option value="rejected">Rejected</option>
            <option value="interview">Interview Scheduled</option>
          </select>
        </div>

        <div class="stats shadow mb-8">
          <div class="stat">
            <div class="stat-title">Total Applied</div>
            <div class="stat-value">88</div>
          </div>
          <div class="stat">
            <div class="stat-title">Response Rate</div>
            <div class="stat-value">34%</div>
          </div>
          <div class="stat">
            <div class="stat-title">Interviews</div>
            <div class="stat-value">12</div>
          </div>
          <div class="stat">
            <div class="stat-title">This Week</div>
            <div class="stat-value">23</div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body p-0">
            <table class="table table-zebra">
            <thead>
              <tr>
                <th>Job & Company</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th>Response Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each mockApplications as application}
                <tr>
                  <td>
                    <div class="font-bold text-primary">{application.title}</div>
                    <div class="text-sm text-base-content/70">{application.company}</div>
                    <div class="text-xs text-base-content/50">{application.location}</div>
                  </td>
                  <td>
                    <div class="text-sm">{application.appliedDate}</div>
                    <div class="text-xs text-base-content/50">{application.appliedAgo}</div>
                  </td>
                  <td>
                    <span class="badge badge-warning">{application.status}</span>
                  </td>
                  <td>
                    <div class="text-sm">{application.responseTime}</div>
                  </td>
                  <td>
                    <div class="dropdown dropdown-end">
                      <button class="btn btn-ghost btn-sm" tabindex="0">⋮</button>
                      <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li><a href="#view">👁️ View Details</a></li>
                        <li><a href="#update">🔄 Update Status</a></li>
                        <li><a href="#note">📝 Add Note</a></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
            </table>
          </div>
        </div>
      </div>
    {:else if activeTab === 'logs'}
      <div class="logs-tab">
        <div class="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h3 class="text-2xl font-bold text-primary">System Logs</h3>
          <div class="flex gap-4 items-center">
            <select bind:value={logLevel} class="select select-bordered">
              <option value="all">All Levels</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <button class="btn btn-error" onclick={clearLogs}>
              <span>🗑️</span> Clear Logs
            </button>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <div class="mockup-code">
              {#each mockLogs as log}
                <pre class="log-entry {log.level.toLowerCase()}"><span class="text-info">{log.time}</span> <span class="font-bold">[{log.level}]</span> <span>{log.message}</span></pre>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {:else if activeTab === 'analytics'}
      <div class="analytics-tab">
        <h3 class="text-3xl font-bold text-primary mb-8">Analytics Dashboard</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-3xl font-bold text-primary">256</div>
                  <div class="text-base-content/70">Jobs Scraped</div>
                  <div class="text-success text-sm">+14 today</div>
                </div>
                <div class="text-4xl opacity-70">🔍</div>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-3xl font-bold text-primary">88</div>
                  <div class="text-base-content/70">Applications</div>
                  <div class="text-success text-sm">12% success</div>
                </div>
                <div class="text-4xl opacity-70">✅</div>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-3xl font-bold text-primary">$97,000</div>
                  <div class="text-base-content/70">Avg Salary (AUD)</div>
                  <div class="text-info text-sm">$80k - $130k</div>
                </div>
                <div class="text-4xl opacity-70">💰</div>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-3xl font-bold text-primary">34%</div>
                  <div class="text-base-content/70">Response Rate</div>
                  <div class="text-info text-sm">3.2 days</div>
                </div>
                <div class="text-4xl opacity-70">📊</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h4 class="card-title text-primary">Applications Over Time</h4>
              <div class="h-64 bg-base-200 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center">
                <div class="text-center">
                  <div class="text-4xl mb-4">📈</div>
                  <div class="text-lg font-semibold text-primary">Timeline Chart</div>
                  <div class="text-sm text-base-content/70">Chart integration needed</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h4 class="card-title text-primary">Salary Distribution</h4>
              <div class="h-64 bg-base-200 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center">
                <div class="text-center">
                  <div class="text-4xl mb-4">💰</div>
                  <div class="text-lg font-semibold text-primary">Salary Histogram</div>
                  <div class="text-sm text-base-content/70">Chart integration needed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h4 class="card-title text-primary mb-6">Top Companies</h4>
            <div class="overflow-x-auto">
              <table class="table table-zebra">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Jobs Posted</th>
                    <th>Applied</th>
                    <th>Response Rate</th>
                    <th>Avg Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {#each topCompanies as company}
                    <tr>
                      <td class="font-semibold">{company.name}</td>
                      <td>{company.jobs}</td>
                      <td>{company.applied}</td>
                      <td><span class="badge badge-info">{company.responseRate}</span></td>
                      <td class="font-semibold">{company.avgSalary}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

