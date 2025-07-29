// Job Filter Content Script
// Hides job postings from blocked companies on LinkedIn and Indeed

class JobFilter {
  constructor() {
    this.blockedCompanies = [];
    this.filterSettings = {
      hideApplied: false,
      hidePromoted: false,
      hideReposted: false
    };
    this.isEnabled = true;
    this.observer = null;
    this.init();
  }

  async init() {
    await this.loadBlockedCompanies();
    await this.loadFilterSettings();
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

  // Load filter settings from storage
  async loadFilterSettings() {
    try {
      const result = await chrome.storage.sync.get(['filterSettings']);
      this.filterSettings = result.filterSettings || {
        hideApplied: false,
        hidePromoted: false,
        hideReposted: false
      };
      console.log('Job Filter: Loaded filter settings:', this.filterSettings);
    } catch (error) {
      console.error('Job Filter: Error loading filter settings:', error);
      this.filterSettings = {
        hideApplied: false,
        hidePromoted: false,
        hideReposted: false
      };
    }
  }

  // Setup message listener for popup communication
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'UPDATE_FILTER_SETTINGS') {
        this.blockedCompanies = message.companies || [];
        this.filterSettings = message.filterSettings || this.filterSettings;
        console.log('Job Filter: Updated filter settings:', this.filterSettings);
        
        // Re-evaluate all jobs to show/hide based on updated settings
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

  // Main function to hide jobs based on all filter criteria
  hideJobs() {
    if (!this.isEnabled) {
      return;
    }

    const jobCards = this.getJobCards();
    let hiddenCount = 0;

    jobCards.forEach(card => {
      // Check if this specific job has been unblocked
      if (card.hasAttribute('data-job-filter-unblocked')) {
        return; // This specific job should not be hidden
      }

      if (this.shouldHideJob(card)) {
        this.hideJobCard(card);
        hiddenCount++;
      }
    });

    if (hiddenCount > 0) {
      console.log(`Job Filter: Hidden ${hiddenCount} job postings based on filter criteria`);
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
      const isCurrentlyHidden = card.hasAttribute('data-job-filter-hidden');
      const isSpecificallyUnblocked = card.hasAttribute('data-job-filter-unblocked');
      const shouldBeHidden = this.shouldHideJob(card) && !isSpecificallyUnblocked;

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

  // Get footer text from job card for status detection
  getFooterText(card) {
    if (!card) return '';
    
    const footerWrapper = card.querySelector('.job-card-list__footer-wrapper');
    if (footerWrapper) {
      return footerWrapper.textContent.toLowerCase().trim();
    }
    
    return '';
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

  // Check if job should be hidden based on filter settings
  shouldHideJob(card) {
    if (!card) return false;
    
    // Check company blocking
    const companyName = this.extractCompanyName(card);
    if (this.isCompanyBlocked(companyName, card)) {
      return true;
    }
    
    // Check if job is already applied
    if (this.filterSettings.hideApplied && this.isJobApplied(card)) {
      return true;
    }
    
    // Check if job is promoted/sponsored
    if (this.filterSettings.hidePromoted && this.isJobPromoted(card)) {
      return true;
    }
    
    // Check if job is reposted
    if (this.filterSettings.hideReposted && this.isJobReposted(card)) {
      return true;
    }
    
    return false;
  }

  // Check if job is already applied
  isJobApplied(card) {
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    const isIndeed = window.location.hostname.includes('indeed.com');
    
    if (isLinkedIn) {
      // Check for footer wrapper with "Applied" text
      const footerText = this.getFooterText(card);
      if (footerText && footerText.includes('applied')) {
        return true;
      }
      
      // Fallback to other LinkedIn applied job indicators
      const appliedSelectors = [
        '[data-testid="job-card-applied"]',
        '.job-card-container__applied',
        '.artdeco-inline-feedback--success',
        '[aria-label*="Applied"]',
        '.job-card-container__status--applied'
      ];
      
      return appliedSelectors.some(selector => card.querySelector(selector));
    } else if (isIndeed) {
      // Indeed applied job indicators
      const appliedSelectors = [
        '[data-testid="applied-job"]',
        '.jobsearch-ResultsList .applied',
        '[aria-label*="Applied"]'
      ];
      
      return appliedSelectors.some(selector => card.querySelector(selector));
    }
    
    return false;
  }

  // Check if job is promoted/sponsored
  isJobPromoted(card) {
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    const isIndeed = window.location.hostname.includes('indeed.com');
    
    if (isLinkedIn) {
      // Check for footer wrapper with "Promoted" or "Sponsored" text
      const footerText = this.getFooterText(card);
      if (footerText && (footerText.includes('promoted') || footerText.includes('sponsored'))) {
        return true;
      }
      
      // Fallback to other LinkedIn promoted job indicators
      const promotedSelectors = [
        '[data-testid="job-card-promoted"]',
        '.job-card-container__promoted',
        '[aria-label*="Promoted"]',
        '.job-card-container__sponsored',
        '[data-testid="job-card-sponsored"]'
      ];
      
      return promotedSelectors.some(selector => card.querySelector(selector));
    } else if (isIndeed) {
      // Indeed promoted job indicators
      const promotedSelectors = [
        '[data-testid="promoted-job"]',
        '.jobsearch-ResultsList .promoted',
        '[aria-label*="Promoted"]',
        '.jobsearch-ResultsList .sponsored'
      ];
      
      return promotedSelectors.some(selector => card.querySelector(selector));
    }
    
    return false;
  }

  // Check if job is reposted
  isJobReposted(card) {
    const isLinkedIn = window.location.hostname.includes('linkedin.com');
    const isIndeed = window.location.hostname.includes('indeed.com');
    
    if (isLinkedIn) {
      // Check for footer wrapper with "Reposted" text
      const footerText = this.getFooterText(card);
      if (footerText && footerText.includes('reposted')) {
        return true;
      }
      
      // Fallback to other LinkedIn reposted job indicators
      const repostedSelectors = [
        '[data-testid="job-card-reposted"]',
        '.job-card-container__reposted',
        '[aria-label*="Reposted"]',
        '.job-card-container__repost'
      ];
      
      return repostedSelectors.some(selector => card.querySelector(selector));
    } else if (isIndeed) {
      // Indeed reposted job indicators
      const repostedSelectors = [
        '[data-testid="reposted-job"]',
        '.jobsearch-ResultsList .reposted',
        '[aria-label*="Reposted"]'
      ];
      
      return repostedSelectors.some(selector => card.querySelector(selector));
    }
    
    return false;
  }

  // Hide a job card
  hideJobCard(card) {
    if (card.hasAttribute('data-job-filter-hidden')) {
      return; // Already hidden
    }

    // Check if this specific job has been unblocked
    if (card.hasAttribute('data-job-filter-unblocked')) {
      return; // This specific job should not be hidden
    }

    // Mark the card as hidden by our extension
    card.setAttribute('data-job-filter-hidden', 'true');

    // Apply blur and reduced opacity instead of hiding
    card.style.transition = 'all 0.3s ease-out';
    card.style.filter = 'blur(2px)';
    card.style.opacity = '0.3';
    card.style.pointerEvents = 'none'; // Prevent interaction
    
    // Add a subtle visual indicator
    card.style.border = '1px solid rgba(255, 0, 0, 0.2)';
    card.style.borderRadius = '4px';
    
    // Add unblock button
    this.addUnblockButton(card);
  }

  // Show a previously hidden job card
  showJobCard(card) {
    if (!card.hasAttribute('data-job-filter-hidden')) {
      return; // Not hidden by our extension
    }

    // Remove our hidden marker
    card.removeAttribute('data-job-filter-hidden');

    // Remove unblock button if it exists
    this.removeUnblockButton(card);

    // Restore the card to normal appearance
    card.style.transition = 'all 0.3s ease-in';
    card.style.filter = '';
    card.style.opacity = '';
    card.style.pointerEvents = '';
    card.style.border = '';
    card.style.borderRadius = '';
    
    setTimeout(() => {
      card.style.transition = '';
    }, 300);
  }

  // Add unblock button to a job card
  addUnblockButton(card) {
    // Remove existing button if any
    this.removeUnblockButton(card);
    
    // Create a separate overlay div that sits on top of everything
    const overlay = document.createElement('div');
    overlay.className = 'job-filter-unblock-overlay';
    overlay.innerHTML = '<button class="job-filter-unblock-btn">👁️ Unblock</button>';
    
    // Style the overlay
    Object.assign(overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: '999999',
      pointerEvents: 'none', // Allow clicks to pass through to job card
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      padding: '10px'
    });
    
    // Style the button
    const button = overlay.querySelector('.job-filter-unblock-btn');
    Object.assign(button.style, {
      background: 'rgba(255, 255, 255, 0.98)',
      border: '1px solid #ff4444',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
      color: '#ff4444',
      fontWeight: 'bold',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      transition: 'all 0.2s ease',
      filter: 'none',
      backdropFilter: 'none',
      transform: 'translateZ(0)',
      isolation: 'isolate',
      pointerEvents: 'auto', // Make button clickable
      border: 'none',
      outline: 'none'
    });
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = '#ff4444';
      button.style.color = 'white';
      button.style.transform = 'translateZ(0) scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255, 255, 255, 0.98)';
      button.style.color = '#ff4444';
      button.style.transform = 'translateZ(0) scale(1)';
    });
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unblockSpecificJob(card);
    });
    
    // Make card position relative if it isn't already
    if (getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
    
    // Add overlay to card
    card.appendChild(overlay);
  }

  // Remove unblock button from a job card
  removeUnblockButton(card) {
    const existingOverlay = card.querySelector('.job-filter-unblock-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }

  // Unblock specific job (not the entire company)
  async unblockSpecificJob(card) {
    const jobId = card.getAttribute('data-occludable-job-id');
    if (!jobId) {
      console.log('Job Filter: Could not find job ID for this card');
      return;
    }
    
    // Mark this specific job as unblocked
    card.setAttribute('data-job-filter-unblocked', 'true');
    
    // Show this specific job
    this.showJobCard(card);
    
    console.log(`Job Filter: Unblocked specific job with ID: ${jobId}`);
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
