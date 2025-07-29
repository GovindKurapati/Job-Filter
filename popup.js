// DOM elements
const companyInput = document.getElementById('companyInput');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const companiesList = document.getElementById('companiesList');
const status = document.getElementById('status');
const toggleApplied = document.getElementById('toggleApplied');
const togglePromoted = document.getElementById('togglePromoted');
const toggleReposted = document.getElementById('toggleReposted');

// Load blocked companies and filter settings from storage
let blockedCompanies = [];
let filterSettings = {
  hideApplied: false,
  hidePromoted: false,
  hideReposted: false
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadBlockedCompanies();
  await loadFilterSettings();
  renderCompaniesList();
  renderToggleStates();
  checkCurrentTab();
  
  // Add event listeners
  addBtn.addEventListener('click', addCompany);
  clearBtn.addEventListener('click', clearAllCompanies);
  companyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCompany();
    }
  });
  
  // Add toggle event listeners
  toggleApplied.addEventListener('click', () => toggleFilter('hideApplied'));
  togglePromoted.addEventListener('click', () => toggleFilter('hidePromoted'));
  toggleReposted.addEventListener('click', () => toggleFilter('hideReposted'));
});

// Check if current tab is a supported job site
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && (tab.url.includes('linkedin.com/jobs') || tab.url.includes('indeed.com'))) {
      updateStatus('Extension active on this page');
    } else {
      updateStatus('Visit LinkedIn Jobs or Indeed to use filters');
    }
  } catch (error) {
    console.error('Error checking current tab:', error);
    updateStatus('Ready to filter jobs');
  }
}

// Load blocked companies from Chrome storage
async function loadBlockedCompanies() {
  try {
    const result = await chrome.storage.sync.get(['blockedCompanies']);
    blockedCompanies = result.blockedCompanies || [];
  } catch (error) {
    console.error('Error loading blocked companies:', error);
    blockedCompanies = [];
  }
}

// Load filter settings from Chrome storage
async function loadFilterSettings() {
  try {
    const result = await chrome.storage.sync.get(['filterSettings']);
    filterSettings = result.filterSettings || {
      hideApplied: false,
      hidePromoted: false,
      hideReposted: false
    };
  } catch (error) {
    console.error('Error loading filter settings:', error);
    filterSettings = {
      hideApplied: false,
      hidePromoted: false,
      hideReposted: false
    };
  }
}

// Save filter settings to Chrome storage
async function saveFilterSettings() {
  try {
    await chrome.storage.sync.set({ filterSettings });
    updateStatus('Filter settings saved');
  } catch (error) {
    console.error('Error saving filter settings:', error);
    updateStatus('Error saving filter settings');
  }
}

// Toggle filter setting
async function toggleFilter(setting) {
  filterSettings[setting] = !filterSettings[setting];
  await saveFilterSettings();
  renderToggleStates();
  notifyContentScript();
}

// Render toggle states
function renderToggleStates() {
  toggleApplied.classList.toggle('active', filterSettings.hideApplied);
  togglePromoted.classList.toggle('active', filterSettings.hidePromoted);
  toggleReposted.classList.toggle('active', filterSettings.hideReposted);
}

// Save blocked companies to Chrome storage
async function saveBlockedCompanies() {
  try {
    await chrome.storage.sync.set({ blockedCompanies });
    updateStatus(`Saved ${blockedCompanies.length} blocked companies`);
  } catch (error) {
    console.error('Error saving blocked companies:', error);
    updateStatus('Error saving companies');
  }
}

// Add a new company to the blocked list
async function addCompany() {
  const companyName = companyInput.value.trim();
  
  if (!companyName) {
    updateStatus('Please enter a company name');
    return;
  }
  
  if (blockedCompanies.includes(companyName)) {
    updateStatus('Company already in blocked list');
    return;
  }
  
  blockedCompanies.push(companyName);
  await saveBlockedCompanies();
  renderCompaniesList();
  companyInput.value = '';
  updateStatus(`Added "${companyName}" to blocked list`);
  
  // Notify content script to update
  notifyContentScript();
}

// Remove a company from the blocked list
async function removeCompany(companyName) {
  blockedCompanies = blockedCompanies.filter(company => company !== companyName);
  await saveBlockedCompanies();
  renderCompaniesList();
  updateStatus(`Removed "${companyName}" from blocked list`);
  
  // Notify content script to update
  notifyContentScript();
}

// Clear all blocked companies
async function clearAllCompanies() {
  if (blockedCompanies.length === 0) {
    updateStatus('No companies to clear');
    return;
  }
  
  blockedCompanies = [];
  await saveBlockedCompanies();
  renderCompaniesList();
  updateStatus('Cleared all blocked companies');
  
  // Notify content script to update
  notifyContentScript();
}

  // Render the companies list
  function renderCompaniesList() {
    if (blockedCompanies.length === 0) {
      companiesList.innerHTML = '<div class="empty-state">No companies blocked yet</div>';
      return;
    }
    
    companiesList.innerHTML = blockedCompanies.map(company => `
      <div class="company-item">
        <span class="company-name">${company}</span>
        <button class="remove-btn" data-company="${company}">Remove</button>
      </div>
    `).join('');
    
    // Add event listeners to remove buttons
    const removeButtons = companiesList.querySelectorAll('.remove-btn');
    removeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const company = button.getAttribute('data-company');
        removeCompany(company);
      });
    });
  }

// Update status message
function updateStatus(message) {
  status.textContent = message;
  setTimeout(() => {
    const filterCount = Object.values(filterSettings).filter(Boolean).length;
    const filterText = filterCount > 0 ? ` + ${filterCount} filters active` : '';
    status.textContent = `Ready to filter jobs (${blockedCompanies.length} companies blocked${filterText})`;
  }, 2000);
}

// Notify content script to refresh blocked companies and filter settings
async function notifyContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && (tab.url.includes('linkedin.com/jobs') || tab.url.includes('indeed.com'))) {
      // Check if content script is available before sending message
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'UPDATE_FILTER_SETTINGS', 
          companies: blockedCompanies,
          filterSettings: filterSettings
        });
      } catch (messageError) {
        // Content script not loaded or not available
        console.log('Content script not available on this page, settings saved for next page load');
        updateStatus('Settings saved - will apply when you visit LinkedIn/Indeed');
      }
    } else {
      updateStatus('Please visit LinkedIn Jobs or Indeed to apply filters');
    }
  } catch (error) {
    console.error('Error notifying content script:', error);
    updateStatus('Settings saved - will apply when you visit LinkedIn/Indeed');
  }
}

 