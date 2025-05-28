// Options script for Social Fact Checker extension

// DOM elements
const apiKeyInput = document.getElementById('api-key');
const ocrApiKeyInput = document.getElementById('ocr-api-key');
const showInlineToggle = document.getElementById('show-inline-toggle');
const autoCheckToggle = document.getElementById('auto-check-toggle');
const saveButton = document.getElementById('save-btn');
const resetButton = document.getElementById('reset-btn');
const statusElement = document.getElementById('status');

// Default settings
const defaultSettings = {
  apiKey: '',
  ocrApiKey: '',
  showInlineResults: true,
  autoCheckEnabled: false
};

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['apiKey', 'ocrApiKey', 'showInlineResults', 'autoCheckEnabled'], (data) => {
    // Fill form with saved settings
    apiKeyInput.value = data.apiKey || '';
    ocrApiKeyInput.value = data.ocrApiKey || '';
    showInlineToggle.checked = data.showInlineResults !== false;
    autoCheckToggle.checked = data.autoCheckEnabled === true;
  });
}

// Save settings to storage
function saveSettings() {
  const settings = {
    apiKey: apiKeyInput.value.trim(),
    ocrApiKey: ocrApiKeyInput.value.trim(),
    showInlineResults: showInlineToggle.checked,
    autoCheckEnabled: autoCheckToggle.checked
  };
  
  chrome.storage.sync.set(settings, () => {
    // Show saved message
    showStatus('Settings saved successfully!', 'success');
  });
}

// Reset settings to defaults
function resetSettings() {
  // Reset form values
  apiKeyInput.value = defaultSettings.apiKey;
  ocrApiKeyInput.value = defaultSettings.ocrApiKey;
  showInlineToggle.checked = defaultSettings.showInlineResults;
  autoCheckToggle.checked = defaultSettings.autoCheckEnabled;
  
  // Save default settings
  saveSettings();
  showStatus('Settings reset to defaults', 'success');
}

// Show status message
function showStatus(message, type = 'success') {
  statusElement.textContent = message;
  statusElement.className = `status status-${type}`;
  statusElement.style.display = 'block';
  
  // Hide message after a delay
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetSettings); 