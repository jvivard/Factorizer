// Background script for Social Fact Checker extension
// This script handles API communication and data persistence

// Configuration
const config = {
  apiUrl: 'https://api.perplexity.ai/chat/completions',
  apiKey: '', // Will be set from storage
  cacheExpiry: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
  maxCacheEntries: 100,
  ocrServiceUrl: 'https://api.ocr.space/parse/image'
};

// In-memory cache for fast responses
let factCheckCache = {};

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('FACTORIZER extension installed');
  
  // Remove any existing context menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create context menu for images
    chrome.contextMenus.create({
      id: 'checkImageFact',
      title: 'Fact check this image',
      contexts: ['image'],
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating image context menu:', chrome.runtime.lastError);
      } else {
        console.log('Image context menu created successfully');
      }
    });
    
    // Create context menu for selected text
    chrome.contextMenus.create({
      id: 'checkSelectedFact',
      title: 'Fact check selected text',
      contexts: ['selection'],
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating text context menu:', chrome.runtime.lastError);
      } else {
        console.log('Text context menu created successfully');
      }
    });
  });
  
  // Initialize storage with default values if not already set
  chrome.storage.sync.get(['apiKey', 'showInlineResults', 'autoCheckEnabled'], (data) => {
    if (!data.hasOwnProperty('showInlineResults')) {
      chrome.storage.sync.set({ showInlineResults: true });
    }
    
    if (!data.hasOwnProperty('autoCheckEnabled')) {
      chrome.storage.sync.set({ autoCheckEnabled: false });
    }
    
    // Clear cache on install/update
    factCheckCache = {};
  });
});

// Also register context menus on browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('FACTORIZER browser startup');
  
  // Remove any existing context menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create context menu for images
    chrome.contextMenus.create({
      id: 'checkImageFact',
      title: 'Fact check this image',
      contexts: ['image'],
    });
    
    // Create context menu for selected text
    chrome.contextMenus.create({
      id: 'checkSelectedFact',
      title: 'Fact check selected text',
      contexts: ['selection'],
    });
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  if (info.menuItemId === 'checkImageFact') {
    console.log('Image fact check requested for:', info.srcUrl);
    
    // Make sure we have a valid image URL
    if (!info.srcUrl) {
      showNotification('No image URL found to fact-check.', tab.id);
      return;
    }
    
    // Process image URL
    processImageForFactCheck(info.srcUrl, tab.id);
  } else if (info.menuItemId === 'checkSelectedFact') {
    console.log('Text fact check requested for:', info.selectionText);
    
    // Make sure we have selected text
    if (!info.selectionText) {
      showNotification('No text selected. Please select some text to fact-check.', tab.id);
      return;
    }
    
    // Process selected text
    checkFacts(info.selectionText)
      .then(result => {
        // Display results in a popup or notification
        displayFactCheckResult(result, tab.id);
      })
      .catch(error => {
        console.error('Error checking facts:', error);
        showNotification('Error checking facts. Please try again.', tab.id);
      });
  }
});

// Process image to extract text and then fact check
async function processImageForFactCheck(imageUrl, tabId) {
  try {
    // Show processing notification
    showNotification('Processing image...', tabId);
    
    // Extract text from image using OCR
    const extractedText = await extractTextFromImage(imageUrl);
    
    if (!extractedText || extractedText.trim() === '') {
      showNotification('No text found in this image.', tabId);
      return;
    }
    
    // Show extracted text notification
    showNotification(`Text extracted: "${extractedText.substring(0, 50)}${extractedText.length > 50 ? '...' : ''}"`, tabId);
    
    // Check the facts of the extracted text
    const result = await checkFacts(extractedText);
    
    // Display the results
    displayFactCheckResult(result, tabId);
    
  } catch (error) {
    console.error('Error processing image:', error);
    showNotification('Error processing image. Please try again.', tabId);
  }
}

// Extract text from image using OCR service
async function extractTextFromImage(imageUrl) {
  try {
    // First check if we have API key for OCR service
    const data = await chrome.storage.sync.get(['ocrApiKey']);
    if (!data.ocrApiKey) {
      // Fall back to a simple method if no OCR API key
      // This is a placeholder - in reality we would use a proper OCR service
      return "No OCR API key set. Please add your OCR API key in the extension options.";
    }
    
    // Create a form data object to send to OCR service
    const formData = new FormData();
    formData.append('apikey', data.ocrApiKey);
    formData.append('url', imageUrl);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    
    // Call the OCR service
    const response = await fetch(config.ocrServiceUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Parse the OCR result
    if (result && result.ParsedResults && result.ParsedResults.length > 0) {
      return result.ParsedResults[0].ParsedText;
    } else {
      throw new Error('No text found in image');
    }
    
  } catch (error) {
    console.error('Error extracting text from image:', error);
    return null;
  }
}

// Show a notification to the user
function showNotification(message, tabId) {
  // Create a notification in the active tab using scripting API
  chrome.scripting.executeScript({
    target: { tabId },
    func: (message) => {
      // Create notification element
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.backgroundColor = '#1a73e8';
      notification.style.color = 'white';
      notification.style.padding = '12px 20px';
      notification.style.borderRadius = '8px';
      notification.style.zIndex = '9999';
      notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      notification.style.maxWidth = '80%';
      notification.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
      notification.textContent = message;
      
      // Add to page
      document.body.appendChild(notification);
      
      // Remove after delay
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 500);
      }, 5000);
    },
    args: [message]
  });
}

// Display fact check result
function displayFactCheckResult(result, tabId) {
  // Create a popup with the fact check result
  chrome.scripting.executeScript({
    target: { tabId },
    func: (result) => {
      // Create popup container
      const popup = document.createElement('div');
      popup.style.position = 'fixed';
      popup.style.top = '50%';
      popup.style.left = '50%';
      popup.style.transform = 'translate(-50%, -50%)';
      popup.style.backgroundColor = 'white';
      popup.style.padding = '20px';
      popup.style.borderRadius = '8px';
      popup.style.zIndex = '10000';
      popup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
      popup.style.width = '450px';
      popup.style.maxWidth = '90%';
      popup.style.maxHeight = '80%';
      popup.style.overflow = 'auto';
      popup.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
      
      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '10px';
      closeBtn.style.right = '10px';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.fontSize = '24px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.color = '#5f6368';
      closeBtn.onclick = () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
      };
      
      // Create header
      const header = document.createElement('h2');
      header.textContent = 'Fact Check Result';
      header.style.color = '#1a73e8';
      header.style.margin = '0 0 16px 0';
      header.style.fontSize = '18px';
      
      // Create rating
      const rating = document.createElement('div');
      rating.style.marginBottom = '16px';
      rating.style.fontWeight = 'bold';
      rating.style.fontSize = '16px';
      
      // Set rating color
      let ratingColor = 'gray';
      switch(result.rating) {
        case 'True': ratingColor = 'green'; break;
        case 'Mostly True': ratingColor = '#4CAF50'; break;
        case 'Mixed': ratingColor = '#FF9800'; break;
        case 'Mostly False': ratingColor = '#F44336'; break;
        case 'False': ratingColor = 'red'; break;
      }
      
      rating.textContent = `Rating: ${result.rating}`;
      rating.style.color = ratingColor;
      
      // Create explanation
      const explanation = document.createElement('p');
      explanation.textContent = result.explanation || 'No explanation available.';
      explanation.style.margin = '16px 0';
      explanation.style.lineHeight = '1.4';
      
      // Create sources section if available
      const sourcesContainer = document.createElement('div');
      sourcesContainer.style.marginTop = '16px';
      
      if (result.sources && result.sources.length > 0) {
        const sourcesTitle = document.createElement('h3');
        sourcesTitle.textContent = 'Sources:';
        sourcesTitle.style.fontSize = '14px';
        sourcesTitle.style.margin = '0 0 8px 0';
        
        const sourcesList = document.createElement('ul');
        sourcesList.style.paddingLeft = '20px';
        sourcesList.style.margin = '0';
        
        result.sources.forEach(source => {
          const sourceItem = document.createElement('li');
          const sourceLink = document.createElement('a');
          sourceLink.href = source.url;
          sourceLink.textContent = source.title || source.url;
          sourceLink.target = '_blank';
          sourceLink.style.color = '#1a73e8';
          
          sourceItem.appendChild(sourceLink);
          sourcesList.appendChild(sourceItem);
        });
        
        sourcesContainer.appendChild(sourcesTitle);
        sourcesContainer.appendChild(sourcesList);
      }
      
      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
      overlay.style.zIndex = '9999';
      overlay.onclick = () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
      };
      
      // Assemble popup
      popup.appendChild(closeBtn);
      popup.appendChild(header);
      popup.appendChild(rating);
      popup.appendChild(explanation);
      popup.appendChild(sourcesContainer);
      
      // Add to page
      document.body.appendChild(overlay);
      document.body.appendChild(popup);
    },
    args: [result]
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  // Check facts from content script
  if (request.action === 'checkFacts') {
    console.log('Processing checkFacts request for text:', request.text.substring(0, 50) + '...');
    
    checkFacts(request.text)
      .then(result => {
        console.log('Fact check completed, sending response');
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error checking facts:', error);
        sendResponse({ error: 'Failed to check facts. Please try again.' });
      });
    return true; // Keep the message channel open for the async response
  }
  
  // Get statistics
  if (request.action === 'getStats') {
    console.log('Processing getStats request');
    getStats().then(sendResponse);
    return true;
  }
  
  // Clear cache
  if (request.action === 'clearCache') {
    console.log('Processing clearCache request');
    factCheckCache = {};
    sendResponse({ success: true, message: 'Cache cleared' });
    return true;
  }
});

// Check if text is in cache
function checkCache(text) {
  const normalizedText = text.trim().toLowerCase();
  const cacheItem = factCheckCache[normalizedText];
  
  if (cacheItem && Date.now() - cacheItem.timestamp < config.cacheExpiry) {
    return cacheItem.result;
  }
  
  return null;
}

// Add result to cache
function addToCache(text, result) {
  const normalizedText = text.trim().toLowerCase();
  
  // Add to cache with timestamp
  factCheckCache[normalizedText] = {
    result: result,
    timestamp: Date.now()
  };
  
  // Limit cache size by removing oldest entries
  const cacheEntries = Object.keys(factCheckCache);
  if (cacheEntries.length > config.maxCacheEntries) {
    const oldestEntry = cacheEntries.reduce((oldest, key) => {
      return (factCheckCache[oldest].timestamp < factCheckCache[key].timestamp) ? oldest : key;
    });
    
    delete factCheckCache[oldestEntry];
  }
}

// Main fact-checking function
async function checkFacts(text) {
  try {
    console.log('Starting fact check for text');
    
    // First check the cache
    const cachedResult = checkCache(text);
    if (cachedResult) {
      console.log('Returning cached result');
      return cachedResult;
    }
    
    // Get API key from storage
    console.log('Getting API key from storage');
    const data = await chrome.storage.sync.get(['apiKey']);
    if (!data.apiKey) {
      console.error('API key not set');
      return { 
        error: 'API key not set. Please configure it in the extension options.' 
      };
    }
    
    // Call Perplexity API
    console.log('Calling Perplexity API');
    const response = await callPerplexityAPI(text, data.apiKey);
    
    // Process the response
    console.log('Processing API response');
    const result = processAPIResponse(response, text);
    
    // Add the result to cache
    console.log('Adding result to cache');
    addToCache(text, result);
    
    // Update statistics
    console.log('Updating stats');
    updateStats(result.rating);
    
    return result;
  } catch (error) {
    console.error('Error in checkFacts:', error);
    throw error;
  }
}

// Call the Perplexity API
async function callPerplexityAPI(text, apiKey) {
  try {
    const prompt = `Fact check the following statement and provide a detailed analysis. 
    Statement: "${text}"
    
    Respond with a JSON object with the following fields:
    1. rating: one of "True", "Mostly True", "Mixed", "Mostly False", or "False"
    2. explanation: a brief explanation of your rating
    3. sources: an array of up to 3 reliable sources that support your explanation, with "title" and "url" for each
    
    Format your entire response as a valid JSON object.`;
    
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

// Process the API response
function processAPIResponse(response, originalText) {
  try {
    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('Invalid API response');
    }
    
    const content = response.choices[0].message.content;
    
    // Try to parse the JSON from the content
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response');
    }
    
    const factCheckData = JSON.parse(jsonMatch[0]);
    
    // Validate the response has the required fields
    if (!factCheckData.rating || !factCheckData.explanation) {
      throw new Error('Invalid fact check data format');
    }
    
    // Return the processed data
    return {
      originalText: originalText,
      rating: factCheckData.rating,
      explanation: factCheckData.explanation,
      sources: factCheckData.sources || [],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error processing API response:', error, response);
    return {
      originalText: originalText,
      rating: 'Unknown',
      explanation: 'Could not analyze this statement.',
      sources: [],
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// Update fact-check statistics
async function updateStats(rating) {
  try {
    // Get current stats
    const data = await chrome.storage.local.get(['stats']);
    let stats = data.stats || {
      total: 0,
      ratings: {
        'True': 0,
        'Mostly True': 0,
        'Mixed': 0,
        'Mostly False': 0,
        'False': 0,
        'Unknown': 0
      }
    };
    
    // Update stats
    stats.total++;
    stats.ratings[rating] = (stats.ratings[rating] || 0) + 1;
    
    // Save updated stats
    await chrome.storage.local.set({ stats });
    
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Get current statistics
async function getStats() {
  try {
    const data = await chrome.storage.local.get(['stats']);
    return data.stats || {
      total: 0,
      ratings: {
        'True': 0,
        'Mostly True': 0,
        'Mixed': 0,
        'Mostly False': 0,
        'False': 0,
        'Unknown': 0
      }
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { error: 'Could not retrieve statistics' };
  }
}

// Listen for API key changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.apiKey) {
    console.log('API key updated');
  }
});

// Clean up old cache entries periodically (every hour)
setInterval(() => {
  const now = Date.now();
  for (const key in factCheckCache) {
    if (now - factCheckCache[key].timestamp > config.cacheExpiry) {
      delete factCheckCache[key];
    }
  }
}, 60 * 60 * 1000); 