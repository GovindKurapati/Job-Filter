// Job Filter Content Script
// Hides job postings from blocked companies on LinkedIn and Indeed

class JobFilter {
  constructor() {
    this.blockedCompanies = [];
    this.isEnabled = true;
    this.observer = null;
    this.init();
  }

  async init() {
    await this.loadBlockedCompanies();
    this.setupMessageListener();
    this.startFiltering();
  }

  // Load blocked companies from storage
  async loadBlockedCompanies() {
    try {
      const result = await chrome.storage.sync.get(['blockedCompanies']);
      this.blockedCompanies = result.blockedCompanies || [];
      console.log('Job Filter: Loaded', this.blockedCompanies.length, 'blocked companies');
    } catch (error) {
      console.error('Job Filter: Error loading blocked companies:', error);
      this.blockedCompanies = [];
    }
  }

  // Setup message listener for popup communication
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'UPDATE_BLOCKED_COMPANIES') {
        this.blockedCompanies = message.companies || [];
        console.log('Job Filter: Updated blocked companies:', this.blockedCompanies);
        
        // Re-evaluate all jobs to show/hide based on new blocked list
        this.reEvaluateJobs();
      }
    });
  }

  // Start the filtering process
  startFiltering() {
    // Initial filter
    this.hideJobs();
    
    // Set up mutation observer for dynamic content
    this.setupObserver();
    
    // Also run periodically for safety
    setInterval(() => {
      if (this.isEnabled) {
        this.hideJobs();
      }
    }, 2000);
  }

  // Setup mutation observer to watch for new job postings
  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldRefilter = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if new job cards were added
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isJobCard(node) || node.querySelector && node.querySelector('[data-entity-urn*="jobPosting"], li[data-occludable-job-id], .job_seen_beacon, .jobsearch-ResultsList > div')) {
                shouldRefilter = true;
              }
            }
          });
        }
      });

      if (shouldRefilter && this.isEnabled) {
        setTimeout(() => this.hideJobs(), 100);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Check if an element is a job card
  isJobCard(element) {
    return element.matches && (
      element.matches('[data-entity-urn*="jobPosting"]') ||
      element.matches('li[data-occludable-job-id]') ||
      element.matches('.job_seen_beacon') ||
      element.matches('.jobsearch-ResultsList > div')
    );
  }

  // Main function to hide jobs from blocked companies
  hideJobs() {
    if (!this.isEnabled || this.blockedCompanies.length === 0) {
      return;
    }

    const jobCards = this.getJobCards();
    let hiddenCount = 0;

    jobCards.forEach(card => {
      const companyName = this.extractCompanyName(card);
      
      // Use comprehensive text matching with the entire card
      if (this.isCompanyBlocked(companyName, card)) {
        this.hideJobCard(card);
        hiddenCount++;
      }
    });

    if (hiddenCount > 0) {
      console.log(`Job Filter: Hidden ${hiddenCount} job postings from blocked companies`);
    }
  }

  // Show all previously hidden jobs
  showAllHiddenJobs() {
    const hiddenCards = document.querySelectorAll('[data-job-filter-hidden="true"]');
    let shownCount = 0;

    hiddenCards.forEach(card => {
      this.showJobCard(card);
      shownCount++;
    });

    if (shownCount > 0) {
      console.log(`Job Filter: Shown ${shownCount} previously hidden job postings`);
    }
  }

  // Re-evaluate all jobs (hide blocked ones, show unblocked ones)
  reEvaluateJobs() {
    const jobCards = this.getJobCards();
    let hiddenCount = 0;
    let shownCount = 0;

    jobCards.forEach(card => {
      const companyName = this.extractCompanyName(card);
      const isCurrentlyHidden = card.hasAttribute('data-job-filter-hidden');
      const shouldBeHidden = this.isCompanyBlocked(companyName, card);

      if (shouldBeHidden && !isCurrentlyHidden) {
        this.hideJobCard(card);
        hiddenCount++;
      } else if (!shouldBeHidden && isCurrentlyHidden) {
        this.showJobCard(card);
        shownCount++;
      }
    });

    if (hiddenCount > 0 || shownCount > 0) {
      console.log(`Job Filter: Hidden ${hiddenCount} and shown ${shownCount} job postings`);
    }
  }

  // Get job cards based on current site
  getJobCards() {
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    const isIndeed = window.location.hostname.includes('indeed.com');

    if (isLinkedIn) {
      // Updated selectors for LinkedIn's new job card structure
      return document.querySelectorAll('li[data-occludable-job-id], [data-entity-urn*="jobPosting"]');
    } else if (isIndeed) {
      return document.querySelectorAll('.job_seen_beacon');
    }

    return [];
  }

  // Extract company name from job card
  extractCompanyName(card) {
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    const isIndeed = window.location.hostname.includes('indeed.com');

    if (isLinkedIn) {
      // First try to extract from the new fh-webext-company-info attribute
      const companyInfo = this.extractCompanyFromAttribute(card);
      if (companyInfo) {
        return companyInfo;
      }

      // LinkedIn selectors (fallback for older structure)
      const selectors = [
        '.job-card-container__company-name',
        '.job-card-container__subtitle',
        '[data-testid="job-card-company-name"]',
        '.job-card-container__primary-description',
        '.artdeco-entity-lockup__subtitle'
      ];

      for (const selector of selectors) {
        const element = card.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          if (text && text.length > 0) {
            return text;
          }
        }
      }
    } else if (isIndeed) {
      // Indeed selectors
      const selectors = [
        '[data-testid="company-name"]',
        '.companyName',
        '.company',
        '[data-testid="jobsearch-CompanyInfoContainer"]'
      ];

      for (const selector of selectors) {
        const element = card.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          if (text && text.length > 0) {
            return text;
          }
        }
      }
    }

    return null;
  }

  // Extract company name from the new LinkedIn attribute
  extractCompanyFromAttribute(card) {
    try {
      const companyInfoAttr = card.getAttribute('fh-webext-company-info');
      if (companyInfoAttr) {
        const companyInfo = JSON.parse(companyInfoAttr);
        if (companyInfo && companyInfo.company_name) {
          return companyInfo.company_name;
        }
      }
    } catch (error) {
      console.log('Job Filter: Error parsing company info attribute:', error);
    }
    return null;
  }

  // Get all text content from job card for comprehensive matching
  getAllCardText(card) {
    if (!card) return '';
    
    // Get all text content from the card, including nested elements
    const allText = card.textContent || card.innerText || '';
    
    // Clean up the text: remove extra whitespace, newlines, etc.
    return allText
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n+/g, ' ')  // Replace newlines with spaces
      .trim()
      .toLowerCase();
  }

  // Check if a company is in the blocked list
  isCompanyBlocked(companyName, card) {
    if (!companyName && !card) return false;
    
    // If we have a card, use comprehensive text matching
    if (card) {
      const allCardText = this.getAllCardText(card);
      
      return this.blockedCompanies.some(blockedCompany => {
        const normalizedBlocked = blockedCompany.toLowerCase().trim();
        return allCardText.includes(normalizedBlocked);
      });
    }
    
    // Fallback to original company name matching
    if (companyName) {
      const normalizedCompanyName = companyName.toLowerCase().trim();
      
      return this.blockedCompanies.some(blockedCompany => {
        const normalizedBlocked = blockedCompany.toLowerCase().trim();
        return normalizedCompanyName.includes(normalizedBlocked) || 
               normalizedBlocked.includes(normalizedCompanyName);
      });
    }
    
    return false;
  }

  // Hide a job card
  hideJobCard(card) {
    if (card.style.display === 'none') {
      return; // Already hidden
    }

    // Mark the card as hidden by our extension
    card.setAttribute('data-job-filter-hidden', 'true');

    // Add a subtle fade-out effect
    card.style.transition = 'opacity 0.3s ease-out';
    card.style.opacity = '0';
    
    setTimeout(() => {
      card.style.display = 'none';
      card.style.opacity = '';
      card.style.transition = '';
    }, 300);
  }

  // Show a previously hidden job card
  showJobCard(card) {
    if (!card.hasAttribute('data-job-filter-hidden')) {
      return; // Not hidden by our extension
    }

    // Remove our hidden marker
    card.removeAttribute('data-job-filter-hidden');

    // Show the card with fade-in effect
    card.style.transition = 'opacity 0.3s ease-in';
    card.style.display = '';
    card.style.opacity = '0';
    
    // Trigger reflow
    card.offsetHeight;
    
    setTimeout(() => {
      card.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
      card.style.transition = '';
      card.style.opacity = '';
    }, 300);
  }

  // Enable/disable filtering
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.hideJobs();
    } else {
      // Show all hidden jobs when disabled
      this.showAllHiddenJobs();
    }
  }

  // Cleanup
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize the job filter when the page loads
let jobFilter;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    jobFilter = new JobFilter();
  });
} else {
  jobFilter = new JobFilter();
}

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  if (jobFilter) {
    jobFilter.destroy();
  }
});
