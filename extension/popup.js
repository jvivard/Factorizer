// Popup script for Social Fact Checker extension

// DOM elements
const showInlineToggle = document.getElementById('show-inline-toggle');
const optionsBtn = document.getElementById('options-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const statTotal = document.getElementById('stat-total');
const statTrue = document.getElementById('stat-true');
const statMostlyTrue = document.getElementById('stat-mostly-true');
const statMixed = document.getElementById('stat-mixed');
const statMostlyFalse = document.getElementById('stat-mostly-false');
const statFalse = document.getElementById('stat-false');

// Load settings
function loadSettings() {
  console.log('Loading settings');
  chrome.storage.sync.get(['showInlineResults'], (data) => {
    console.log('Settings loaded:', data);
    showInlineToggle.checked = data.showInlineResults !== false;
  });
}

// Save settings
function saveSettings() {
  console.log('Saving settings');
  const showInline = showInlineToggle.checked;
  chrome.storage.sync.set({ showInlineResults: showInline }, () => {
    console.log('Settings saved');
  });
}

// Load statistics
function loadStats() {
  console.log('Loading stats');
  chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    console.log('Stats received:', stats);
    if (!stats || stats.error) {
      console.error('Error loading stats:', stats?.error || 'Unknown error');
      return;
    }
    
    // Update the statistics display
    statTotal.textContent = stats.total || 0;
    statTrue.textContent = stats.ratings?.True || 0;
    statMostlyTrue.textContent = stats.ratings?.['Mostly True'] || 0;
    statMixed.textContent = stats.ratings?.Mixed || 0;
    statMostlyFalse.textContent = stats.ratings?.['Mostly False'] || 0;
    statFalse.textContent = stats.ratings?.False || 0;
  });
}

// Clear the fact check cache
function clearCache() {
  chrome.runtime.sendMessage({ action: 'clearCache' }, (response) => {
    if (response && response.success) {
      // Show a confirmation animation on the button
      clearCacheBtn.textContent = 'Cache Cleared!';
      clearCacheBtn.style.backgroundColor = '#4CAF50';
      
      // Reset button text after a delay
      setTimeout(() => {
        clearCacheBtn.textContent = 'Clear Cache';
        clearCacheBtn.style.backgroundColor = '#1a73e8';
      }, 2000);
    }
  });
}

// Open options page
function openOptions() {
  chrome.runtime.openOptionsPage();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  
  // Load initial data
  loadSettings();
  loadStats();
  
  // Setting change handlers
  showInlineToggle.addEventListener('change', () => {
    console.log('Show inline toggle changed:', showInlineToggle.checked);
    saveSettings();
  });
  
  // Button click handlers
  optionsBtn.addEventListener('click', () => {
    console.log('Options button clicked');
    openOptions();
  });
  
  clearCacheBtn.addEventListener('click', () => {
    console.log('Clear cache button clicked');
    clearCache();
  });
});

// Listen for storage changes to update the UI
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.showInlineResults) {
    showInlineToggle.checked = changes.showInlineResults.newValue;
  }
}); 