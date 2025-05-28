/**
 * Social Media Fact Checker Extension - Content Script
 * This script is injected into social media pages to:
 * 1. Identify social media posts
 * 2. Extract text content
 * 3. Add fact-check buttons
 * 4. Display fact-checking results
 */

// Configuration for supported platforms
const PLATFORMS = {
  'twitter.com': {
    postSelector: 'article[data-testid="tweet"]',
    textSelector: '[data-testid="tweetText"]',
    actionSelector: '[role="group"]',
    extractText: extractTwitterText
  },
  'facebook.com': {
    postSelector: '[role="article"]',
    textSelector: '.xdj266r, .xz9dl7a',  // Covers most Facebook post text containers
    actionSelector: '.x1qjc9v5, .xifccgj',  // Action bar area
    extractText: extractFacebookText
  },
  'instagram.com': {
    postSelector: 'article._ab6k, article._aatb',
    textSelector: '._a9zs, ._a9zr',
    actionSelector: '._ae5q, ._aabd',
    extractText: extractInstagramText
  },
  'linkedin.com': {
    postSelector: '.feed-shared-update-v2',
    textSelector: '.feed-shared-update-v2__description-wrapper',
    actionSelector: '.feed-shared-social-actions',
    extractText: extractLinkedInText
  }
};

// Track processed posts to avoid duplicates
const processedPosts = new Set();

// Track active fact-check requests
const activeChecks = new Map();

// Store results keyed by post ID or content hash
const resultStore = new Map();

// Current platform configuration
let currentPlatform = null;

/**
 * Initialize the content script
 */
function init() {
  // Determine which platform we're on
  const hostname = window.location.hostname;
  for (const platform in PLATFORMS) {
    if (hostname.includes(platform)) {
      currentPlatform = PLATFORMS[platform];
      console.log('Detected platform:', platform);
      break;
    }
  }

  if (!currentPlatform) {
    console.warn('Unsupported platform:', hostname);
    return;
  }

  // Set up mutation observer to detect new posts
  setupObserver();
  
  // Also process any existing posts
  processPosts();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);

  console.log('Social Media Fact Checker content script initialized');
}

/**
 * Set up mutation observer to detect new posts dynamically added to the page
 */
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldProcess = true;
        break;
      }
    }
    
    if (shouldProcess) {
      processPosts();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Process all posts on the page
 */
function processPosts() {
  if (!currentPlatform) return;
  
  const posts = document.querySelectorAll(currentPlatform.postSelector);
  posts.forEach(post => {
    // Skip already processed posts
    if (processedPosts.has(post)) return;
    
    try {
      attachFactCheckButton(post);
      processedPosts.add(post);
    } catch (error) {
      console.error('Error processing post:', error);
    }
  });
}

/**
 * Attach fact-check button to post
 * @param {Element} post - The post element
 */
function attachFactCheckButton(post) {
  // Find action area where we'll insert our button
  const actionArea = post.querySelector(currentPlatform.actionSelector);
  if (!actionArea) return;
  
  // Check if we already added a button
  if (actionArea.querySelector('.fact-check-btn')) return;
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'fact-check-container';
  
  // Create button
  const button = document.createElement('button');
  button.className = 'fact-check-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 9l-9 9-7-7"></path>
    </svg>
    <span>Fact Check</span>
  `;
  
  // Add event listener
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    factCheckPost(post, button);
  });
  
  // Append button
  buttonContainer.appendChild(button);
  actionArea.appendChild(buttonContainer);
}

/**
 * Handle fact-checking for a specific post
 * @param {Element} post - The post element
 * @param {Element} button - The fact-check button
 */
async function factCheckPost(post, button) {
  // Extract the post ID or generate a unique identifier
  const postId = post.dataset.testid || post.id || generatePostId(post);
  
  // If we're already checking this post, do nothing
  if (activeChecks.has(postId)) return;
  
  try {
    // Extract text from post
    const text = currentPlatform.extractText(post);
    if (!text || text.trim().length === 0) {
      showTooltip(button, 'No text content found to fact-check');
      return;
    }
    
    // Update button state
    button.classList.add('checking');
    button.innerHTML = `
      <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      <span>Checking...</span>
    `;
    
    // Track active check
    activeChecks.set(postId, Date.now());
    
    // Check if we have a cached result first
    const cachedResult = await chrome.runtime.sendMessage({
      action: 'getCachedResults',
      text: text
    });
    
    let results;
    if (cachedResult && cachedResult.results) {
      console.log('Using cached result for post:', postId);
      results = cachedResult.results;
    } else {
      // Send fact-check request to background script
      results = await chrome.runtime.sendMessage({
        action: 'factCheck',
        text: text
      });
    }
    
    // Handle error
    if (results.error) {
      throw new Error(results.error);
    }
    
    // Store result for this post
    resultStore.set(postId, results);
    
    // Show results
    displayResults(post, results);
    
    // Update button state
    button.classList.remove('checking');
    button.classList.add('checked');
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9 12l2 2 4-4"></path>
      </svg>
      <span>Fact Checked</span>
    `;
    
  } catch (error) {
    console.error('Error fact-checking post:', error);
    
    // Update button state to show error
    button.classList.remove('checking');
    button.classList.add('error');
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>Error</span>
    `;
    
    // Show error details in tooltip
    showTooltip(button, `Error: ${error.message}`);
    
  } finally {
    // Clean up
    activeChecks.delete(postId);
  }
}

/**
 * Display fact-checking results
 * @param {Element} post - The post element
 * @param {Object} results - The fact-checking results
 */
function displayResults(post, results) {
  // Check if results container already exists
  let container = post.querySelector('.fact-check-results');
  
  if (!container) {
    // Create results container
    container = document.createElement('div');
    container.className = 'fact-check-results';
    post.appendChild(container);
  }
  
  // Set rating class based on overall rating
  const ratingClass = getRatingClass(results.overall_rating);
  container.className = `fact-check-results ${ratingClass}`;
  
  // Create content for results
  container.innerHTML = `
    <div class="fact-check-header">
      <div class="fact-check-badge ${ratingClass}">
        ${results.overall_rating || 'UNVERIFIABLE'}
      </div>
      <button class="fact-check-close">×</button>
    </div>
    <div class="fact-check-summary">
      ${results.summary || 'No summary available'}
    </div>
    <div class="fact-check-claims">
      ${renderClaims(results.claims)}
    </div>
  `;
  
  // Add event listener for close button
  const closeButton = container.querySelector('.fact-check-close');
  closeButton.addEventListener('click', () => {
    container.classList.add('hidden');
  });
}

/**
 * Render claims list
 * @param {Array} claims - List of claim objects
 * @returns {string} HTML for claims list
 */
function renderClaims(claims) {
  if (!claims || claims.length === 0) {
    return '<p>No specific claims analyzed.</p>';
  }
  
  return claims.map(claim => `
    <div class="fact-check-claim">
      <div class="fact-check-claim-header">
        <span class="claim-text">${claim.claim}</span>
        <span class="claim-rating ${getRatingClass(claim.rating)}">${claim.rating}</span>
      </div>
      <div class="claim-explanation">
        ${claim.explanation || 'No explanation provided'}
      </div>
      ${renderSources(claim.sources)}
    </div>
  `).join('');
}

/**
 * Render sources list
 * @param {Array} sources - List of sources
 * @returns {string} HTML for sources list
 */
function renderSources(sources) {
  if (!sources || sources.length === 0) {
    return '';
  }
  
  return `
    <div class="claim-sources">
      <h4>Sources:</h4>
      <ul>
        ${sources.map(source => `<li>${formatSource(source)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Format source as link if it's a URL
 * @param {string} source - Source text or URL
 * @returns {string} Formatted source HTML
 */
function formatSource(source) {
  try {
    // Check if source is a URL
    if (source.startsWith('http') || source.startsWith('www.')) {
      const url = source.startsWith('www.') ? `https://${source}` : source;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${source}</a>`;
    }
  } catch (e) {
    // Ignore URL parsing errors
  }
  
  // Return plain text for non-URLs
  return source;
}

/**
 * Get CSS class based on fact-check rating
 * @param {string} rating - The fact-check rating
 * @returns {string} CSS class name
 */
function getRatingClass(rating) {
  if (!rating) return 'rating-unverifiable';
  
  const ratingLower = rating.toLowerCase();
  if (ratingLower.includes('true')) return 'rating-true';
  if (ratingLower.includes('false')) return 'rating-false';
  if (ratingLower.includes('misleading') || ratingLower.includes('mixed')) return 'rating-mixed';
  return 'rating-unverifiable';
}

/**
 * Show tooltip with message
 * @param {Element} element - Element to attach tooltip to
 * @param {string} message - Message to show
 */
function showTooltip(element, message) {
  let tooltip = document.createElement('div');
  tooltip.className = 'fact-check-tooltip';
  tooltip.textContent = message;
  
  // Position and show tooltip
  element.appendChild(tooltip);
  
  // Remove after 3 seconds
  setTimeout(() => {
    tooltip.remove();
  }, 3000);
}

/**
 * Extract text from Twitter post
 * @param {Element} post - Twitter post element
 * @returns {string} Extracted text
 */
function extractTwitterText(post) {
  const textElement = post.querySelector(currentPlatform.textSelector);
  return textElement ? textElement.innerText : '';
}

/**
 * Extract text from Facebook post
 * @param {Element} post - Facebook post element
 * @returns {string} Extracted text
 */
function extractFacebookText(post) {
  const textElements = post.querySelectorAll(currentPlatform.textSelector);
  return Array.from(textElements)
    .map(el => el.innerText)
    .filter(text => text && text.trim().length > 0)
    .join('\n\n');
}

/**
 * Extract text from Instagram post
 * @param {Element} post - Instagram post element
 * @returns {string} Extracted text
 */
function extractInstagramText(post) {
  const textElements = post.querySelectorAll(currentPlatform.textSelector);
  return Array.from(textElements)
    .map(el => el.innerText)
    .filter(text => text && text.trim().length > 0)
    .join('\n\n');
}

/**
 * Extract text from LinkedIn post
 * @param {Element} post - LinkedIn post element
 * @returns {string} Extracted text
 */
function extractLinkedInText(post) {
  const textElement = post.querySelector(currentPlatform.textSelector);
  return textElement ? textElement.innerText : '';
}

/**
 * Generate a unique ID for a post
 * @param {Element} post - Post element
 * @returns {string} Generated ID
 */
function generatePostId(post) {
  // Try to get some content to hash
  const text = post.innerText || '';
  const timestamp = Date.now();
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  return `post_${Math.abs(hash)}_${timestamp}`;
}

/**
 * Handle messages from background script
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 */
function handleMessage(message, sender) {
  if (message.action === 'factCheckComplete') {
    // This is handled directly in factCheckPost, but could be used
    // for background-initiated fact checks in the future
  }
}

// Initialize the content script when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 