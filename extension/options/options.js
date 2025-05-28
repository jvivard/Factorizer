/**
 * Social Media Fact Checker Extension - Options Script
 */

// DOM Elements
const apiKeyInput = document.getElementById('api-key');
const toggleKeyVisibility = document.getElementById('toggle-key-visibility');
const showIcon = document.getElementById('show-icon');
const hideIcon = document.getElementById('hide-icon');
const autoCheckToggle = document.getElementById('auto-check');
const autoCheckStatus = document.getElementById('auto-check-status');
const checkThreshold = document.getElementById('check-threshold');
const thresholdValue = document.getElementById('threshold-value');
const disabledSitesList = document.getElementById('disabled-sites-list');
const themeSelect = document.getElementById('theme');
const showSourcesToggle = document.getElementById('show-sources');
const sourcesStatus = document.getElementById('sources-status');
const clearDataButton = document.getElementById('clear-data');
const saveButton = document.getElementById('save-btn');
const restoreDefaultsButton = document.getElementById('restore-defaults-btn');
const statusMessage = document.getElementById('status-message');

// Constants
const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  AUTO_CHECK: 'autoCheck',
  CHECK_THRESHOLD: 'checkThreshold',
  DISABLED_SITES: 'disabled_sites',
  THEME: 'theme',
  SHOW_SOURCES: 'showSources'
};

// Default settings
const DEFAULT_SETTINGS = {
  autoCheck: false,
  checkThreshold: 50,
  disabled_sites: [],
  theme: 'system',
  showSources: true
};

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load current settings
    await loadSettings();
    
    // Setup event listeners
    setupEventListeners();

  } catch (error) {
    console.error('Error initializing options page:', error);
    showStatusMessage('Error loading settings. Please try again.', 'error');
  }
});

/**
 * Load current settings from storage
 */
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.AUTO_CHECK,
    STORAGE_KEYS.CHECK_THRESHOLD,
    STORAGE_KEYS.DISABLED_SITES,
    STORAGE_KEYS.THEME,
    STORAGE_KEYS.SHOW_SOURCES
  ]);
  
  // API Key
  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }
  
  // Auto Check
  const autoCheck = settings.autoCheck ?? DEFAULT_SETTINGS.autoCheck;
  autoCheckToggle.checked = autoCheck;
  updateAutoCheckStatus();
  
  // Check Threshold
  const threshold = settings.checkThreshold ?? DEFAULT_SETTINGS.checkThreshold;
  checkThreshold.value = threshold;
  thresholdValue.textContent = `${threshold}%`;
  
  // Disabled Sites
  const disabledSites = settings.disabled_sites ?? DEFAULT_SETTINGS.disabled_sites;
  renderDisabledSites(disabledSites);
  
  // Theme
  const theme = settings.theme ?? DEFAULT_SETTINGS.theme;
  themeSelect.value = theme;
  
  // Show Sources
  const showSources = settings.showSources ?? DEFAULT_SETTINGS.showSources;
  showSourcesToggle.checked = showSources;
  updateSourcesStatus();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Toggle API Key visibility
  toggleKeyVisibility.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      showIcon.classList.add('hidden');
      hideIcon.classList.remove('hidden');
    } else {
      apiKeyInput.type = 'password';
      showIcon.classList.remove('hidden');
      hideIcon.classList.add('hidden');
    }
  });
  
  // Auto Check toggle
  autoCheckToggle.addEventListener('change', updateAutoCheckStatus);
  
  // Check Threshold slider
  checkThreshold.addEventListener('input', () => {
    thresholdValue.textContent = `${checkThreshold.value}%`;
  });
  
  // Show Sources toggle
  showSourcesToggle.addEventListener('change', updateSourcesStatus);
  
  // Clear Data button
  clearDataButton.addEventListener('click', clearAllData);
  
  // Save button
  saveButton.addEventListener('click', saveSettings);
  
  // Restore Defaults button
  restoreDefaultsButton.addEventListener('click', restoreDefaults);
}

/**
 * Update the auto check status text
 */
function updateAutoCheckStatus() {
  autoCheckStatus.textContent = autoCheckToggle.checked ? 'On' : 'Off';
}

/**
 * Update the show sources status text
 */
function updateSourcesStatus() {
  sourcesStatus.textContent = showSourcesToggle.checked ? 'On' : 'Off';
}

/**
 * Render the list of disabled sites
 * @param {Array} sites - List of disabled sites
 */
function renderDisabledSites(sites) {
  // Clear current list
  disabledSitesList.innerHTML = '';
  
  // Handle empty list
  if (!sites || sites.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-list';
    emptyState.textContent = 'No sites have been disabled';
    disabledSitesList.appendChild(emptyState);
    return;
  }
  
  // Add each site to the list
  sites.forEach(site => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    
    const siteName = document.createElement('div');
    siteName.className = 'site-name';
    siteName.textContent = site;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-site';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => removeSite(site));
    
    siteItem.appendChild(siteName);
    siteItem.appendChild(removeButton);
    disabledSitesList.appendChild(siteItem);
  });
}

/**
 * Remove a site from the disabled sites list
 * @param {string} site - Site to remove
 */
async function removeSite(site) {
  try {
    // Get current disabled sites
    const { disabled_sites = [] } = await chrome.storage.sync.get(STORAGE_KEYS.DISABLED_SITES);
    
    // Filter out the site to remove
    const updatedSites = disabled_sites.filter(s => s !== site);
    
    // Save updated list
    await chrome.storage.sync.set({ [STORAGE_KEYS.DISABLED_SITES]: updatedSites });
    
    // Update UI
    renderDisabledSites(updatedSites);
    
    showStatusMessage(`Removed ${site} from disabled sites`, 'success');
  } catch (error) {
    console.error('Error removing site:', error);
    showStatusMessage('Error removing site', 'error');
  }
}

/**
 * Save all settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      [STORAGE_KEYS.API_KEY]: apiKeyInput.value.trim(),
      [STORAGE_KEYS.AUTO_CHECK]: autoCheckToggle.checked,
      [STORAGE_KEYS.CHECK_THRESHOLD]: parseInt(checkThreshold.value, 10),
      [STORAGE_KEYS.THEME]: themeSelect.value,
      [STORAGE_KEYS.SHOW_SOURCES]: showSourcesToggle.checked
    };
    
    // Validate API key
    if (!settings[STORAGE_KEYS.API_KEY]) {
      showStatusMessage('Please enter a valid API key', 'error');
      apiKeyInput.focus();
      return;
    }
    
    // Save to storage
    await chrome.storage.sync.set(settings);
    
    showStatusMessage('Settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatusMessage('Error saving settings. Please try again.', 'error');
  }
}

/**
 * Clear all extension data
 */
async function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This will remove all settings, history, and cached results.')) {
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      
      showStatusMessage('All data cleared successfully. Reloading page...', 'success');
      
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error clearing data:', error);
      showStatusMessage('Error clearing data', 'error');
    }
  }
}

/**
 * Restore default settings
 */
async function restoreDefaults() {
  if (confirm('Are you sure you want to restore default settings? This will not clear your API key or fact-check history.')) {
    try {
      // Get current API key to preserve it
      const { apiKey } = await chrome.storage.sync.get(STORAGE_KEYS.API_KEY);
      
      // Set default settings but keep API key
      const settings = {
        ...DEFAULT_SETTINGS,
        [STORAGE_KEYS.API_KEY]: apiKey
      };
      
      await chrome.storage.sync.set(settings);
      
      // Reload settings in UI
      await loadSettings();
      
      showStatusMessage('Default settings restored', 'success');
    } catch (error) {
      console.error('Error restoring defaults:', error);
      showStatusMessage('Error restoring default settings', 'error');
    }
  }
}

/**
 * Show a status message
 * @param {string} message - Message to show
 * @param {string} type - Message type (success, error)
 */
function showStatusMessage(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  // Hide message after 5 seconds
  setTimeout(() => {
    statusMessage.className = 'status-message';
  }, 5000);
} 