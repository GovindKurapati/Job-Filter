// DOM elements
const companyInput = document.getElementById('companyInput');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const companiesList = document.getElementById('companiesList');
const status = document.getElementById('status');

// Load blocked companies from storage
let blockedCompanies = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadBlockedCompanies();
  renderCompaniesList();
  
  // Add event listeners
  addBtn.addEventListener('click', addCompany);
  clearBtn.addEventListener('click', clearAllCompanies);
  companyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCompany();
    }
  });
});

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
    status.textContent = `Ready to filter jobs (${blockedCompanies.length} companies blocked)`;
  }, 2000);
}

// Notify content script to refresh blocked companies
async function notifyContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && (tab.url.includes('linkedin.com/jobs') || tab.url.includes('indeed.com'))) {
      await chrome.tabs.sendMessage(tab.id, { 
        type: 'UPDATE_BLOCKED_COMPANIES', 
        companies: blockedCompanies 
      });
    }
  } catch (error) {
    console.error('Error notifying content script:', error);
  }
}

 