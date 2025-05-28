/**
 * Social Media Fact Checker Extension - Popup Script
 */

// DOM Elements
const statusMessage = document.getElementById('status-message');
const siteNameElement = document.getElementById('site-name');
const siteIconElement = document.getElementById('site-icon');
const siteActiveToggle = document.getElementById('site-active');
const checksCountElement = document.getElementById('checks-count');
const trueCountElement = document.getElementById('true-count');
const falseCountElement = document.getElementById('false-count');
const mixedCountElement = document.getElementById('mixed-count');
const recentListElement = document.getElementById('recent-list');
const optionsButton = document.getElementById('options-btn');
const clearButton = document.getElementById('clear-btn');

// Constants
const STORAGE_KEYS = {
  HISTORY: 'fact_check_history',
  STATS: 'fact_check_stats',
  DISABLED_SITES: 'disabled_sites'
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeSiteInfo();
    await loadStats();
    await loadRecentChecks();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if API key is configured
    checkApiKeyConfig();

  } catch (error) {
    console.error('Error initializing popup:', error);
    showStatus('Error initializing extension. Try reloading.', 'error');
  }
});

/**
 * Initialize site information
 */
async function initializeSiteInfo() {
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  
  if (!currentTab) return;
  
  // Get hostname
  const url = new URL(currentTab.url);
  const hostname = url.hostname;
  
  // Update site name
  siteNameElement.textContent = hostname;
  
  // Set appropriate icon
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    siteIconElement.textContent = '𝕏';
  } else if (hostname.includes('facebook.com')) {
    siteIconElement.textContent = 'ꜰ';
  } else if (hostname.includes('instagram.com')) {
    siteIconElement.textContent = '📷';
  } else if (hostname.includes('linkedin.com')) {
    siteIconElement.textContent = 'in';
  } else if (hostname.includes('tiktok.com')) {
    siteIconElement.textContent = '▶';
  } else {
    siteIconElement.textContent = '🌐';
  }
  
  // Check if site is active
  const { disabled_sites = [] } = await chrome.storage.sync.get(STORAGE_KEYS.DISABLED_SITES);
  siteActiveToggle.checked = !disabled_sites.includes(hostname);
}

/**
 * Load fact-check statistics
 */
async function loadStats() {
  const { fact_check_stats = {} } = await chrome.storage.sync.get(STORAGE_KEYS.STATS);
  
  const stats = {
    total: 0,
    true: 0,
    false: 0,
    mixed: 0,
    ...fact_check_stats
  };
  
  // Update UI
  checksCountElement.textContent = stats.total;
  trueCountElement.textContent = stats.true;
  falseCountElement.textContent = stats.false;
  mixedCountElement.textContent = stats.mixed;
}

/**
 * Load recent fact checks
 */
async function loadRecentChecks() {
  const { fact_check_history = [] } = await chrome.storage.sync.get(STORAGE_KEYS.HISTORY);
  
  // Clear current list
  while (recentListElement.firstChild) {
    recentListElement.removeChild(recentListElement.firstChild);
  }
  
  // Handle empty state
  if (!fact_check_history.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No fact checks yet. Click the fact check button on social media posts to get started.';
    recentListElement.appendChild(emptyState);
    return;
  }
  
  // Add recent checks (most recent first)
  fact_check_history.slice(0, 5).forEach(check => {
    const item = createCheckItem(check);
    recentListElement.appendChild(item);
  });
}

/**
 * Create a check item for the recent list
 * @param {Object} check - The fact check data
 * @returns {HTMLElement} The created DOM element
 */
function createCheckItem(check) {
  const { text, results, source, timestamp } = check;
  
  // Create item container
  const item = document.createElement('div');
  item.className = 'check-item';
  
  // Create header with title and rating
  const header = document.createElement('div');
  header.className = 'check-header';
  
  // Create title (truncated)
  const title = document.createElement('div');
  title.className = 'check-title';
  title.textContent = truncateText(text, 50);
  header.appendChild(title);
  
  // Create rating badge
  const rating = document.createElement('div');
  rating.className = `check-rating rating-${getRatingClass(results.overall_rating)}`;
  rating.textContent = results.overall_rating || 'UNVERIFIABLE';
  header.appendChild(rating);
  
  // Create source
  const sourceElement = document.createElement('div');
  sourceElement.className = 'check-source';
  sourceElement.textContent = `From: ${source || 'Unknown'} • ${formatDate(timestamp)}`;
  
  // Add elements to item
  item.appendChild(header);
  item.appendChild(sourceElement);
  
  // Add click handler
  item.addEventListener('click', () => {
    // TODO: Open detailed view in a new tab or popup
    chrome.tabs.create({ url: 'details.html?id=' + encodeURIComponent(timestamp) });
  });
  
  return item;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Options button
  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Clear history button
  clearButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all fact-check history?')) {
      await chrome.storage.sync.set({ 
        [STORAGE_KEYS.HISTORY]: [],
      });
      
      showStatus('History cleared successfully', 'success');
      await loadRecentChecks();
    }
  });
  
  // Toggle site activity
  siteActiveToggle.addEventListener('change', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (!currentTab) return;
    
    const url = new URL(currentTab.url);
    const hostname = url.hostname;
    
    // Get current disabled sites
    const { disabled_sites = [] } = await chrome.storage.sync.get(STORAGE_KEYS.DISABLED_SITES);
    
    let newDisabledSites;
    if (siteActiveToggle.checked) {
      // Remove from disabled sites
      newDisabledSites = disabled_sites.filter(site => site !== hostname);
      showStatus(`Fact checking enabled for ${hostname}`, 'success');
    } else {
      // Add to disabled sites
      newDisabledSites = [...disabled_sites, hostname];
      showStatus(`Fact checking disabled for ${hostname}`, 'warning');
    }
    
    // Save updated settings
    await chrome.storage.sync.set({ 
      [STORAGE_KEYS.DISABLED_SITES]: newDisabledSites 
    });
    
    // Notify content script of changes
    chrome.tabs.sendMessage(currentTab.id, { 
      action: 'updateSiteStatus', 
      isEnabled: siteActiveToggle.checked 
    }).catch(err => console.warn('Failed to notify content script:', err));
  });
}

/**
 * Check if API key is configured and show warning if not
 */
async function checkApiKeyConfig() {
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  
  if (!apiKey) {
    showStatus(
      'API key not configured. Please visit options to set up your Perplexity API key.',
      'warning'
    );
  }
}

/**
 * Show a status message in the popup
 * @param {string} message - Message to show
 * @param {string} type - Message type (success, error, warning)
 */
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = type;
  
  // Hide after 5 seconds unless it's a warning
  if (type !== 'warning') {
    setTimeout(() => {
      statusMessage.className = '';
    }, 5000);
  }
}

/**
 * Helper to get CSS class based on fact-check rating
 * @param {string} rating - The fact-check rating
 * @returns {string} CSS class name suffix
 */
function getRatingClass(rating) {
  if (!rating) return 'unverifiable';
  
  const ratingLower = rating.toLowerCase();
  if (ratingLower.includes('true')) return 'true';
  if (ratingLower.includes('false')) return 'false';
  if (ratingLower.includes('misleading') || ratingLower.includes('mixed')) return 'mixed';
  return 'unverifiable';
}

/**
 * Truncate text to a specific length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format a timestamp as a relative time string
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return `${diffDay}d ago`;
  } else {
    // Format as MM/DD/YY
    return date.toLocaleDateString();
  }
} 