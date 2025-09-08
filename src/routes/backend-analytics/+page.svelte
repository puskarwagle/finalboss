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

<div class="job-tracker">
  <div class="container">
    <div class="header">
      <h1>🔍 Job Tracker</h1>
      
      <div class="tab-navigation">
        {#each tabs as tab}
          <button 
            class="tab-btn" 
            class:active={activeTab === tab.id}
            onclick={() => setActiveTab(tab.id)}
          >
            <span class="tab-icon">{tab.icon}</span>
            {tab.label}
            {#if tab.count !== null}
              <span class="tab-count">{tab.count}</span>
            {/if}
          </button>
        {/each}
      </div>
      
      <div class="settings-dropdown">
        <div class="dropdown-trigger">
          <span>⋮</span>
        </div>
        <ul class="dropdown-menu">
          <li><a href="#export">📤 Export Data</a></li>
          <li><a href="#clear">🗑️ Clear Tab</a></li>
          <li><a href="#refresh">🔄 Refresh All</a></li>
        </ul>
      </div>
    </div>

    {#if activeTab === 'jobs'}
      <div class="jobs-tab">
        <div class="filter-bar">
          <div class="search-group">
            <label>Search Jobs</label>
            <input type="text" placeholder="Search by title, company, or keywords..." bind:value={searchQuery} />
          </div>
          <div class="filter-group">
            <label>Filter</label>
            <select bind:value={filterType}>
              <option value="all">All Jobs</option>
              <option value="today">Posted Today</option>
              <option value="week">This Week</option>
              <option value="high_salary">High Salary</option>
              <option value="remote">Remote Only</option>
            </select>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Found</div>
            <div class="stat-value">256</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Today</div>
            <div class="stat-value">14</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Salary</div>
            <div class="stat-value">$97,000</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Remote</div>
            <div class="stat-value">89</div>
          </div>
        </div>

        <div class="jobs-table-container">
          <table class="jobs-table">
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
                    <input type="checkbox" checked={selectedJobs.includes(job.id)} onchange={() => toggleJobSelection(job.id)} />
                  </td>
                  <td>
                    <div class="job-title">{job.title}</div>
                    <div class="job-company">{job.company}</div>
                    <div class="job-tags">
                      {#each job.tags as tag}
                        <div class="job-tag">{tag}</div>
                      {/each}
                    </div>
                  </td>
                  <td><div class="job-location">{job.location}</div></td>
                  <td><div class="job-salary">{job.salary}</div></td>
                  <td>
                    <div class="job-posted">{job.posted}</div>
                    <div class="job-posted-ago">{job.postedAgo}</div>
                  </td>
                  <td><div class="job-match">{job.match}</div></td>
                  <td>
                    <div class="actions-dropdown">
                      <div class="dropdown-trigger">⋮</div>
                      <ul class="dropdown-menu">
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
          
          <div class="load-more">
            <button class="load-more-btn">
              Load More Jobs (200+ remaining)
            </button>
          </div>
        </div>
        
        <div class="bulk-actions">
          <button class="bulk-action-btn">
            <span>✉️</span>
            Apply to {selectedJobs.length} Jobs
          </button>
          <button class="bulk-action-btn">
            <span>❌</span>
            Blacklist Selected
          </button>
        </div>
      </div>
    {:else if activeTab === 'applied'}
      <div class="applied-tab">
        <div class="applied-header">
          <h3>Application History</h3>
          <select bind:value={applicationFilter}>
            <option value="all">All Applications</option>
            <option value="pending">Pending Response</option>
            <option value="replied">Company Replied</option>
            <option value="rejected">Rejected</option>
            <option value="interview">Interview Scheduled</option>
          </select>
        </div>
        
        <div class="applied-stats">
          <div class="stat-card">
            <div class="stat-label">Total Applied</div>
            <div class="stat-value">88</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Response Rate</div>
            <div class="stat-value">34%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Interviews</div>
            <div class="stat-value">12</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">This Week</div>
            <div class="stat-value">23</div>
          </div>
        </div>

        <div class="applications-table-container">
          <table class="applications-table">
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
                    <div class="app-title">{application.title}</div>
                    <div class="app-company">{application.company}</div>
                    <div class="app-location">{application.location}</div>
                  </td>
                  <td>
                    <div class="app-date">{application.appliedDate}</div>
                    <div class="app-date-ago">{application.appliedAgo}</div>
                  </td>
                  <td>
                    <div class="app-status">{application.status}</div>
                  </td>
                  <td>
                    <div class="app-response">{application.responseTime}</div>
                  </td>
                  <td>
                    <div class="actions-dropdown">
                      <div class="dropdown-trigger">⋮</div>
                      <ul class="dropdown-menu">
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
    {:else if activeTab === 'logs'}
      <div class="logs-tab">
        <div class="logs-header">
          <h3>System Logs</h3>
          <div class="logs-controls">
            <select bind:value={logLevel}>
              <option value="all">All Levels</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <button class="clear-logs-btn" onclick={clearLogs}>
              <span>🗑️</span> Clear Logs
            </button>
          </div>
        </div>
        
        <div class="terminal">
          {#each mockLogs as log}
            <div class="log-entry {log.level.toLowerCase()}">
              <span class="log-time">{log.time}</span>
              <span class="log-level">[{log.level}]</span>
              <span class="log-message">{log.message}</span>
            </div>
          {/each}
        </div>
      </div>
    {:else if activeTab === 'analytics'}
      <div class="analytics-tab">
        <h3>Analytics Dashboard</h3>
        
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-content">
              <div class="kpi-text">
                <div class="kpi-value">256</div>
                <div class="kpi-label">Jobs Scraped</div>
                <div class="kpi-change">+14 today</div>
              </div>
              <div class="kpi-icon">🔍</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-content">
              <div class="kpi-text">
                <div class="kpi-value">88</div>
                <div class="kpi-label">Applications</div>
                <div class="kpi-change">12% success</div>
              </div>
              <div class="kpi-icon">✅</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-content">
              <div class="kpi-text">
                <div class="kpi-value">$97,000</div>
                <div class="kpi-label">Avg Salary (AUD)</div>
                <div class="kpi-change">$80k - $130k</div>
              </div>
              <div class="kpi-icon">💰</div>
            </div>
          </div>
          
          <div class="kpi-card">
            <div class="kpi-content">
              <div class="kpi-text">
                <div class="kpi-value">34%</div>
                <div class="kpi-label">Response Rate</div>
                <div class="kpi-change">3.2 days</div>
              </div>
              <div class="kpi-icon">📊</div>
            </div>
          </div>
        </div>
        
        <div class="charts-row">
          <div class="chart-card">
            <div class="chart-content">
              <h4>Applications Over Time</h4>
              <div class="chart-placeholder">
                <div class="placeholder-content">
                  <div class="placeholder-icon">📈</div>
                  <div class="placeholder-title">Timeline Chart</div>
                  <div class="placeholder-text">Chart integration needed</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="chart-card">
            <div class="chart-content">
              <h4>Salary Distribution</h4>
              <div class="chart-placeholder">
                <div class="placeholder-content">
                  <div class="placeholder-icon">💰</div>
                  <div class="placeholder-title">Salary Histogram</div>
                  <div class="placeholder-text">Chart integration needed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="top-companies-section">
          <div class="top-companies-card">
            <h4>Top Companies</h4>
            <div class="companies-table-container">
              <table class="companies-table">
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
                      <td>{company.name}</td>
                      <td>{company.jobs}</td>
                      <td>{company.applied}</td>
                      <td>{company.responseRate}</td>
                      <td>{company.avgSalary}</td>
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

<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

  :global(body) {
    background: #000;
    font-family: 'Orbitron', monospace;
    color: #00ff00;
    margin: 0;
    padding: 0;
  }

  .job-tracker {
    min-height: 100vh;
    padding: 2rem;
    padding-top: 8rem;
  }

  .container {
    max-width: 1400px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 900;
    color: #00ff00;
    text-shadow: 0 0 20px #00ff0050;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .tab-navigation {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tab-btn {
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tab-btn:hover,
  .tab-btn.active {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .tab-icon {
    font-size: 1.2em;
  }

  .tab-count {
    background: rgba(0, 0, 0, 0.5);
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8em;
  }

  .settings-dropdown {
    position: relative;
  }

  .dropdown-trigger {
    background: #001100;
    border: 1px solid #00ff00;
    color: #00ff00;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Orbitron', monospace;
  }

  .dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: #001100;
    border: 1px solid #00ff00;
    border-radius: 6px;
    padding: 0;
    margin: 0.5rem 0 0 0;
    list-style: none;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 1000;
  }

  .settings-dropdown:hover .dropdown-menu,
  .actions-dropdown:hover .dropdown-menu {
    opacity: 1;
    visibility: visible;
  }

  .dropdown-menu li a {
    display: block;
    padding: 0.75rem 1rem;
    color: #00ff00;
    text-decoration: none;
    font-family: 'Orbitron', monospace;
    transition: all 0.3s ease;
  }

  .dropdown-menu li a:hover {
    background: #003300;
    color: #00ffff;
  }

  .filter-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    align-items: end;
    flex-wrap: wrap;
  }

  .search-group,
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-group {
    flex: 1;
    min-width: 300px;
  }

  label {
    font-size: 0.9rem;
    font-weight: 700;
    color: #00ff00;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  input,
  select {
    background: rgba(0, 20, 0, 0.8);
    border: 1px solid #00ff00;
    border-radius: 6px;
    padding: 0.75rem;
    color: #00ff00;
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #00cc00;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 900;
    color: #00ffff;
    text-shadow: 0 0 10px #00ffff;
  }

  .jobs-table-container,
  .applications-table-container,
  .companies-table-container {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 2rem;
  }

  .jobs-table,
  .applications-table,
  .companies-table {
    width: 100%;
    border-collapse: collapse;
  }

  .jobs-table th,
  .applications-table th,
  .companies-table th {
    background: #003300;
    color: #00ff00;
    padding: 1rem;
    text-align: left;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid #00ff00;
  }

  .jobs-table td,
  .applications-table td,
  .companies-table td {
    padding: 1rem;
    border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    vertical-align: top;
  }

  .job-title,
  .app-title {
    font-weight: 700;
    color: #00ffff;
    margin-bottom: 0.25rem;
  }

  .job-company,
  .app-company {
    color: #00cc00;
    margin-bottom: 0.5rem;
  }

  .job-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .job-tag {
    background: #00ff00;
    color: #000;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .job-match {
    font-weight: 900;
    color: #00ffff;
    font-size: 1.2rem;
  }

  .actions-dropdown {
    position: relative;
  }

  .bulk-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }

  .bulk-action-btn,
  .load-more-btn,
  .clear-logs-btn {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .bulk-action-btn:hover,
  .load-more-btn:hover,
  .clear-logs-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 255, 255, 0.4);
  }

  .load-more {
    text-align: center;
    padding: 2rem;
  }

  .applied-header,
  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .applied-header h3,
  .logs-header h3 {
    font-size: 1.5rem;
    color: #00ff00;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .applied-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .logs-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .terminal {
    background: #000;
    border: 1px solid #00ff00;
    border-radius: 8px;
    padding: 1.5rem;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .log-entry {
    margin-bottom: 0.5rem;
    display: flex;
    gap: 1rem;
  }

  .log-entry.info {
    color: #00ff00;
  }

  .log-entry.debug {
    color: #00ff00;
  }

  .log-entry.warning {
    color: #ffff00;
  }

  .log-entry.error {
    color: #ff0000;
  }

  .log-time {
    color: #00cccc;
    min-width: 80px;
  }

  .log-level {
    color: inherit;
    min-width: 80px;
    font-weight: bold;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .kpi-card {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .kpi-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .kpi-value {
    font-size: 2.5rem;
    font-weight: 900;
    color: #00ffff;
    text-shadow: 0 0 15px #00ffff;
    margin-bottom: 0.5rem;
  }

  .kpi-label {
    color: #00cc00;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.25rem;
  }

  .kpi-change {
    color: #ffff00;
    font-size: 0.9rem;
  }

  .kpi-icon {
    font-size: 3rem;
    opacity: 0.7;
  }

  .charts-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .chart-card {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .chart-card h4 {
    color: #00ff00;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .chart-placeholder {
    height: 250px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px dashed #00ff00;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-content {
    text-align: center;
  }

  .placeholder-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .placeholder-title {
    font-size: 1.2rem;
    color: #00ff00;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .placeholder-text {
    color: #00cc00;
    font-size: 0.9rem;
  }

  .top-companies-section {
    margin-top: 2rem;
  }

  .top-companies-card {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .top-companies-card h4 {
    color: #00ff00;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  @media (max-width: 768px) {
    .job-tracker {
      padding: 1rem;
      padding-top: 6rem;
    }

    h1 {
      font-size: 1.8rem;
    }

    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .tab-navigation {
      justify-content: center;
    }

    .filter-bar {
      flex-direction: column;
    }

    .search-group {
      min-width: auto;
    }

    .stats-grid,
    .applied-stats {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .kpi-grid {
      grid-template-columns: 1fr;
    }

    .charts-row {
      grid-template-columns: 1fr;
    }

    .jobs-table,
    .applications-table,
    .companies-table {
      font-size: 0.9rem;
    }

    .bulk-actions {
      flex-direction: column;
      align-items: center;
    }
  }
</style>