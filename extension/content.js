// Content script for Social Fact Checker extension
// This script runs on matched pages and handles content manipulation

// Configuration
const config = {
  platforms: {
    twitter: {
      postSelector: 'article[data-testid="tweet"], div[data-testid="tweetText"]',
      contentSelector: '[data-testid="tweetText"], .css-901oao',
      actionLocation: '.css-1dbjc4n.r-1ta3fxp.r-18u37iz.r-1wtj0ep.r-1s2bzr4.r-1mdbhws, .css-1dbjc4n.r-18u37iz.r-1h0z5md'
    },
    facebook: {
      postSelector: '[role="article"], .x1yztbdb, ._5pcb',
      contentSelector: '.xdj266r, ._5pbx, .fcg, .ecm0bbzt',
      actionLocation: '.x6s0dn4.x78zum5.x1qughib.x1pi30zi, .x1qjc9v5.x1lliihq, ._6a-y'
    },
    instagram: {
      postSelector: 'article._ab6k, article._aatb, ._a9zs',
      contentSelector: '._a9zs, .C4VMK span, ._aacl',
      actionLocation: '._ae63, ._aang, .x6s0dn4'
    },
    linkedin: {
      postSelector: '.feed-shared-update-v2, .occludable-update',
      contentSelector: '.feed-shared-update-v2__description-wrapper, .feed-shared-text',
      actionLocation: '.feed-shared-social-actions, .social-actions-button'
    },
    tiktok: {
      postSelector: '.tiktok-x6f6za-DivContainer, .tiktok-1soki6-DivItemContainer',
      contentSelector: '.tiktok-j2a19r-SpanText, .tiktok-q9aj5z-PCaption',
      actionLocation: '.tiktok-1iyoj8h-DivActionItemContainer, .tiktok-1sutmyl-DivActionBar'
    }
  },
  buttonClass: 'fact-checker-btn',
  resultClass: 'fact-checker-result'
};

// Determine which platform we're on
function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
  if (host.includes('facebook')) return 'facebook';
  if (host.includes('instagram')) return 'instagram';
  if (host.includes('linkedin')) return 'linkedin';
  if (host.includes('tiktok')) return 'tiktok';
  return null;
}

// Extract text from a post
function extractText(post, platform) {
  const content = post.querySelector(config.platforms[platform].contentSelector);
  return content ? content.textContent.trim() : '';
}

// Create fact-check button
function createFactCheckButton() {
  const button = document.createElement('button');
  button.className = config.buttonClass;
  button.textContent = 'Fact Check';
  button.style.backgroundColor = '#1a73e8';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.padding = '4px 8px';
  button.style.fontSize = '12px';
  button.style.cursor = 'pointer';
  button.style.marginLeft = '8px';
  return button;
}

// Create a result container
function createResultContainer() {
  const container = document.createElement('div');
  container.className = config.resultClass;
  container.style.marginTop = '8px';
  container.style.padding = '8px';
  container.style.backgroundColor = '#f8f9fa';
  container.style.borderRadius = '4px';
  container.style.fontSize = '14px';
  container.style.display = 'none';
  return container;
}

// Check facts via the background script
async function checkFacts(text) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'checkFacts', text }, (response) => {
      resolve(response);
    });
  });
}

// Display fact check results
function displayResults(container, results) {
  container.innerHTML = '';
  container.style.display = 'block';
  
  // If there's an error
  if (results.error) {
    container.innerHTML = `<p style="color: red;">Error: ${results.error}</p>`;
    return;
  }
  
  // Create rating element
  const rating = document.createElement('div');
  rating.style.marginBottom = '8px';
  rating.style.fontWeight = 'bold';
  
  // Set rating color based on factuality
  switch(results.rating) {
    case 'True':
      rating.style.color = 'green';
      break;
    case 'Mostly True':
      rating.style.color = '#4CAF50';
      break;
    case 'Mixed':
      rating.style.color = '#FF9800';
      break;
    case 'Mostly False':
      rating.style.color = '#F44336';
      break;
    case 'False':
      rating.style.color = 'red';
      break;
    default:
      rating.style.color = 'gray';
  }
  
  rating.textContent = `Rating: ${results.rating}`;
  container.appendChild(rating);
  
  // Add explanation
  const explanation = document.createElement('p');
  explanation.textContent = results.explanation;
  container.appendChild(explanation);
  
  // Add sources if available
  if (results.sources && results.sources.length) {
    const sourceList = document.createElement('ul');
    sourceList.style.marginTop = '8px';
    
    results.sources.forEach(source => {
      const sourceItem = document.createElement('li');
      const sourceLink = document.createElement('a');
      sourceLink.href = source.url;
      sourceLink.textContent = source.title || source.url;
      sourceLink.target = '_blank';
      sourceLink.style.color = '#1a73e8';
      
      sourceItem.appendChild(sourceLink);
      sourceList.appendChild(sourceItem);
    });
    
    container.appendChild(sourceList);
  }
}

// Process a single post
function processPost(post, platform) {
  // Check if already processed
  if (post.hasAttribute('data-fact-checked')) return;
  post.setAttribute('data-fact-checked', 'true');
  
  console.log(`Processing post on ${platform}`);
  
  // Find where to insert the button
  const actionContainer = post.querySelector(config.platforms[platform].actionLocation);
  if (!actionContainer) {
    console.error(`Could not find action container using selector: ${config.platforms[platform].actionLocation}`);
    return;
  }
  
  // Create button and result container
  const button = createFactCheckButton();
  const resultContainer = createResultContainer();
  
  // Add button and container to the post
  actionContainer.appendChild(button);
  actionContainer.after(resultContainer);
  console.log('Fact check button added to post');
  
  // Add click handler
  button.addEventListener('click', async () => {
    console.log('Fact check button clicked');
    
    // Change button text to indicate loading
    button.textContent = 'Checking...';
    button.disabled = true;
    
    // Get post text
    const text = extractText(post, platform);
    console.log('Extracted text:', text);
    
    if (!text) {
      console.error('No text content found to fact-check');
      resultContainer.innerHTML = '<p style="color: red;">No text content found to fact-check</p>';
      resultContainer.style.display = 'block';
      button.textContent = 'Fact Check';
      button.disabled = false;
      return;
    }
    
    // Request fact-checking
    try {
      console.log('Sending fact check request to background script');
      const results = await checkFacts(text);
      console.log('Received fact check results:', results);
      displayResults(resultContainer, results);
    } catch (error) {
      console.error('Error during fact checking:', error);
      resultContainer.innerHTML = `<p style="color: red;">Error: ${error.message || 'Failed to check facts'}</p>`;
      resultContainer.style.display = 'block';
    }
    
    // Reset button
    button.textContent = 'Fact Check';
    button.disabled = false;
  });
}

// Process all posts on the page
function processPosts() {
  const platform = detectPlatform();
  if (!platform) return;
  
  console.log(`Processing posts on ${platform}...`);
  
  const platformConfig = config.platforms[platform];
  const posts = document.querySelectorAll(platformConfig.postSelector);
  
  console.log(`Found ${posts.length} posts to process`);
  
  if (posts.length === 0) {
    // If no posts found with standard selectors, try fallback approach
    console.log('No posts found with standard selectors, trying fallback method');
    addFloatingFactCheckButton();
    return;
  }
  
  posts.forEach(post => {
    processPost(post, platform);
  });
}

// Set up a mutation observer to catch new posts
function observeDynamicContent() {
  const platform = detectPlatform();
  if (!platform) return;
  
  const observer = new MutationObserver(mutations => {
    processPosts();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize the content script
function init() {
  // Check if we're on a supported platform
  const platform = detectPlatform();
  if (!platform) {
    console.log('Not on a supported platform. Current URL:', window.location.href);
    return;
  }
  
  console.log('FACTORIZER initializing on ' + platform);
  
  // Update selectors for specific platforms if needed
  updateSelectorsIfNeeded(platform);
  
  // Initial processing
  processPosts();
  
  // Set up observer for dynamic content
  observeDynamicContent();
  
  // Log that extension is active
  console.log('FACTORIZER extension is active on ' + platform);
}

// Update selectors based on current URL if needed
function updateSelectorsIfNeeded(platform) {
  const url = window.location.href;
  
  if (platform === 'twitter' || platform === 'x') {
    if (url.includes('twitter.com/home')) {
      // Home timeline might have different structure
      config.platforms.twitter.actionLocation = '.css-1dbjc4n.r-18u37iz.r-1h0z5md, .css-175oi2r';
    }
  } else if (platform === 'facebook') {
    if (url.includes('facebook.com/groups')) {
      // Group posts might have different structure
      config.platforms.facebook.actionLocation = '.x1i10hfl.xjbqb8w, .x78zum5.x1iyjqo2';
    }
  }
}

// Fallback: add a floating button when standard selectors fail
function addFloatingFactCheckButton() {
  console.log('Adding floating fact check button');
  
  // Check if button already exists
  if (document.getElementById('floating-fact-check-btn')) {
    return;
  }
  
  // Create floating button
  const floatingBtn = document.createElement('div');
  floatingBtn.id = 'floating-fact-check-btn';
  floatingBtn.textContent = 'Fact Check';
  floatingBtn.style.position = 'fixed';
  floatingBtn.style.bottom = '20px';
  floatingBtn.style.right = '20px';
  floatingBtn.style.backgroundColor = '#1a73e8';
  floatingBtn.style.color = 'white';
  floatingBtn.style.padding = '10px 15px';
  floatingBtn.style.borderRadius = '20px';
  floatingBtn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  floatingBtn.style.cursor = 'pointer';
  floatingBtn.style.zIndex = '9999';
  floatingBtn.style.fontSize = '14px';
  
  // Create result container
  const resultContainer = document.createElement('div');
  resultContainer.id = 'floating-fact-check-result';
  resultContainer.style.position = 'fixed';
  resultContainer.style.bottom = '70px';
  resultContainer.style.right = '20px';
  resultContainer.style.width = '300px';
  resultContainer.style.padding = '15px';
  resultContainer.style.backgroundColor = 'white';
  resultContainer.style.borderRadius = '8px';
  resultContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  resultContainer.style.zIndex = '9999';
  resultContainer.style.display = 'none';
  resultContainer.style.maxHeight = '400px';
  resultContainer.style.overflowY = 'auto';
  
  // Add click handler
  floatingBtn.addEventListener('click', async () => {
    console.log('Floating fact check button clicked');
    
    // Show text input dialog
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = `
      <h3 style="margin-top: 0; color: #1a73e8;">Enter text to fact check:</h3>
      <textarea id="fact-check-text-input" style="width: 100%; height: 100px; margin-bottom: 10px; padding: 8px; border: 1px solid #dadce0; border-radius: 4px; font-family: inherit;"></textarea>
      <button id="submit-fact-check" style="background-color: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Check Facts</button>
      <button id="cancel-fact-check" style="background-color: #f1f3f4; color: #5f6368; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 8px;">Cancel</button>
    `;
    
    // Add event listeners to buttons
    document.getElementById('submit-fact-check').addEventListener('click', async () => {
      const text = document.getElementById('fact-check-text-input').value.trim();
      if (!text) {
        resultContainer.innerHTML = '<p style="color: red;">Please enter text to fact check</p>';
        return;
      }
      
      // Show loading message
      resultContainer.innerHTML = '<p>Checking facts...</p>';
      
      try {
        console.log('Sending fact check request for manual text input');
        const results = await checkFacts(text);
        console.log('Received manual fact check results:', results);
        
        // Display results
        displayResultsInContainer(resultContainer, results);
        
      } catch (error) {
        console.error('Error checking facts:', error);
        resultContainer.innerHTML = `<p style="color: red;">Error: ${error.message || 'Failed to check facts'}</p>`;
      }
    });
    
    document.getElementById('cancel-fact-check').addEventListener('click', () => {
      resultContainer.style.display = 'none';
    });
  });
  
  // Add to page
  document.body.appendChild(floatingBtn);
  document.body.appendChild(resultContainer);
}

// Display results in any container
function displayResultsInContainer(container, results) {
  container.innerHTML = '';
  container.style.display = 'block';
  
  // If there's an error
  if (results.error) {
    container.innerHTML = `<p style="color: red;">Error: ${results.error}</p>`;
    return;
  }
  
  // Create rating element
  const rating = document.createElement('div');
  rating.style.marginBottom = '12px';
  rating.style.fontWeight = 'bold';
  rating.style.fontSize = '16px';
  
  // Set rating color based on factuality
  switch(results.rating) {
    case 'True': rating.style.color = 'green'; break;
    case 'Mostly True': rating.style.color = '#4CAF50'; break;
    case 'Mixed': rating.style.color = '#FF9800'; break;
    case 'Mostly False': rating.style.color = '#F44336'; break;
    case 'False': rating.style.color = 'red'; break;
    default: rating.style.color = 'gray';
  }
  
  rating.textContent = `Rating: ${results.rating}`;
  container.appendChild(rating);
  
  // Add explanation
  const explanation = document.createElement('p');
  explanation.textContent = results.explanation;
  explanation.style.lineHeight = '1.4';
  container.appendChild(explanation);
  
  // Add sources if available
  if (results.sources && results.sources.length) {
    const sourcesTitle = document.createElement('h4');
    sourcesTitle.textContent = 'Sources:';
    sourcesTitle.style.marginBottom = '8px';
    container.appendChild(sourcesTitle);
    
    const sourceList = document.createElement('ul');
    sourceList.style.paddingLeft = '20px';
    sourceList.style.margin = '0';
    
    results.sources.forEach(source => {
      const sourceItem = document.createElement('li');
      const sourceLink = document.createElement('a');
      sourceLink.href = source.url;
      sourceLink.textContent = source.title || source.url;
      sourceLink.target = '_blank';
      sourceLink.style.color = '#1a73e8';
      
      sourceItem.appendChild(sourceLink);
      sourceList.appendChild(sourceItem);
    });
    
    container.appendChild(sourceList);
  }
}

// Start the extension
init(); 