/**
 * Social Media Fact Checker Extension - Background Script
 * This script handles the core functionality of the extension:
 * - API communication with fact-checking service
 * - Message handling between content scripts and popup
 * - Result caching and state management
 */

// API configuration
const API_CONFIG = {
  // Default to the deployed API endpoint - this could be updated in settings
  endpoint: 'https://fact-checker-api.example.com/api/fact-check',
  // Cache duration in milliseconds (5 minutes)
  cacheDuration: 5 * 60 * 1000
};

// Cache to store fact-checking results
const resultCache = new Map();

// Track active fact-checking requests
const activeRequests = new Map();

/**
 * Initialize the extension
 */
function init() {
  // Set up message listeners
  chrome.runtime.onMessage.addListener(handleMessage);
  console.log('Social Media Fact Checker background script initialized');
}

/**
 * Handle messages from content scripts and popup
 * @param {Object} request - The message request object
 * @param {Object} sender - Information about the sender
 * @param {Function} sendResponse - Function to send a response
 * @returns {boolean} - True if response will be sent asynchronously
 */
function handleMessage(request, sender, sendResponse) {
  console.log('Received message:', request.action);

  switch (request.action) {
    case 'factCheck':
      handleFactCheck(request.text, sender.tab?.id)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Async response

    case 'getStatus':
      const tabId = sender.tab?.id;
      if (tabId && activeRequests.has(tabId)) {
        sendResponse({ status: 'checking' });
      } else {
        sendResponse({ status: 'idle' });
      }
      return false;

    case 'getCachedResults':
      const key = request.text;
      if (resultCache.has(key) && !isCacheExpired(key)) {
        sendResponse({ results: resultCache.get(key).data });
      } else {
        sendResponse({ results: null });
      }
      return false;

    case 'clearCache':
      resultCache.clear();
      sendResponse({ success: true });
      return false;

    default:
      console.warn('Unknown action:', request.action);
      sendResponse({ error: 'Unknown action' });
      return false;
  }
}

/**
 * Handle fact-checking request
 * @param {string} text - The text to fact-check
 * @param {number} tabId - The tab ID that initiated the request
 * @returns {Promise<Object>} - Fact-checking results
 */
async function handleFactCheck(text, tabId) {
  // Check cache first
  const cacheKey = text;
  if (resultCache.has(cacheKey) && !isCacheExpired(cacheKey)) {
    console.log('Returning cached result for:', cacheKey.substring(0, 30) + '...');
    return resultCache.get(cacheKey).data;
  }

  // Track this request as active
  if (tabId) {
    activeRequests.set(tabId, Date.now());
  }

  try {
    // Retrieve API key from storage
    const { apiKey } = await chrome.storage.sync.get('apiKey');
    
    if (!apiKey) {
      throw new Error('API key not configured. Please visit extension options to set up.');
    }

    // Prepare API request
    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the result
    resultCache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });

    // Request complete
    if (tabId) {
      activeRequests.delete(tabId);
    }

    // Notify the tab that fact-checking is complete
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: 'factCheckComplete',
        results: data,
        textKey: cacheKey
      }).catch(err => console.warn('Failed to notify tab:', err));
    }

    return data;

  } catch (error) {
    console.error('Fact-checking error:', error);
    
    // Request complete (with error)
    if (tabId) {
      activeRequests.delete(tabId);
    }
    
    throw error;
  }
}

/**
 * Check if cached result is expired
 * @param {string} key - The cache key
 * @returns {boolean} - True if cache is expired
 */
function isCacheExpired(key) {
  const cache = resultCache.get(key);
  if (!cache) return true;
  
  const now = Date.now();
  return (now - cache.timestamp) > API_CONFIG.cacheDuration;
}

// Initialize when the extension is loaded
init(); 