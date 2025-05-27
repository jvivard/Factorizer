const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API Endpoints
app.post('/api/fact-check', upload.single('screenshot'), async (req, res) => {
  try {
    // Ensure text was provided
    if (!req.body.text || req.body.text.trim() === '') {
      return res.status(400).json({ error: 'No text provided for fact-checking' });
    }

    const textToCheck = req.body.text;
    console.log(`Received text for fact-checking: "${textToCheck.substring(0, 50)}..."`);
    
    // Make a request to Perplexity Sonar API
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityApiKey) {
      return res.status(500).json({ error: 'Perplexity API key not configured' });
    }

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a professional fact-checker with extensive research capabilities. Your task is to evaluate social media claims for factual accuracy. Focus on identifying false, misleading, or unsubstantiated claims. Provide an overall rating, detailed analysis of specific claims, and reliable sources. Output MUST BE valid JSON in the following format: { "overall_rating": "MOSTLY_TRUE/MIXED/MOSTLY_FALSE", "summary": "Summary of findings", "claims": [{"claim": "Specific claim", "rating": "TRUE/FALSE/MISLEADING/UNVERIFIABLE", "explanation": "Detailed explanation", "sources": ["Source URL or reference"]}] }'
          },
          {
            role: 'user',
            content: `Fact check the following social media post and identify any false or misleading claims:\n\n${textToCheck}`
          }
        ],
        options: {
          search_domain_filter: ["NEWS", "ACADEMIC", "GOVERNMENT"]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${perplexityApiKey}`
        }
      }
    );

    // Extract and format the results
    const responseData = response.data;
    const content = responseData.choices[0].message.content;
    const citations = responseData.citations || [];
    
    let resultData;
    try {
      // Try to parse as JSON if content contains JSON
      if (content.includes('```json')) {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          resultData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Could not extract JSON from markdown code block');
        }
      } else if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        // Direct JSON response
        resultData = JSON.parse(content);
      } else {
        // Try to extract structured data from text response
        const overallRatingMatch = content.match(/overall[_\s]?rating[:\s]+([A-Za-z_]+)/i);
        const summaryMatch = content.match(/summary[:\s]+(.*?)(?=\n\n|\n#|\n\*\*)/is);
        
        resultData = {
          overall_rating: overallRatingMatch ? overallRatingMatch[1].toUpperCase() : "UNVERIFIABLE",
          summary: summaryMatch ? summaryMatch[1].trim() : "No summary available",
          claims: [],
          raw_response: content,
        };

        // Extract claims
        const claimSections = content.match(/claim[:\s]+.*?(?=\n\n(?:claim|$))/igs);
        if (claimSections) {
          resultData.claims = claimSections.map(section => {
            const claimMatch = section.match(/claim[:\s]+(.*?)(?=\n|$)/i);
            const ratingMatch = section.match(/rating[:\s]+([A-Za-z_]+)/i);
            const explanationMatch = section.match(/explanation[:\s]+(.*?)(?=\n\n|\n[#*]|$)/is);
            const sourcesMatch = section.match(/sources?[:\s]+(.*?)(?=\n\n|\n[#*]|$)/is);
            
            return {
              claim: claimMatch ? claimMatch[1].trim() : "Unspecified claim",
              rating: ratingMatch ? ratingMatch[1].toUpperCase() : "UNVERIFIABLE",
              explanation: explanationMatch ? explanationMatch[1].trim() : "No explanation available",
              sources: sourcesMatch ? 
                sourcesMatch[1].split(/\n/).map(s => s.trim().replace(/^[\s\-•*]+/, '')) : 
                []
            };
          });
        }
      }
      
      // Add citations if they aren't already included
      if (citations.length > 0 && !resultData.citations) {
        resultData.citations = citations;
      }
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      // Fall back to returning the raw content with basic structure
      resultData = {
        overall_rating: "UNVERIFIABLE",
        summary: "The fact check could not be properly analyzed due to a technical issue.",
        claims: [{
          claim: "Content from social media post",
          rating: "UNVERIFIABLE",
          explanation: "Could not properly parse the fact check results. Please try again.",
          sources: []
        }],
        raw_response: content,
        error: 'Failed to parse structured output',
        citations
      };
    }

    return res.status(200).json(resultData);
  } catch (error) {
    console.error('Error in fact-check API:', error);
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const statusCode = error.response.status;
      const message = error.response.data?.error?.message || 'API request failed';
      
      if (statusCode === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      } else {
        return res.status(statusCode).json({ error: message });
      }
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(502).json({ error: 'No response from fact-checking service. Please try again.' });
    } else {
      // Something happened in setting up the request that triggered an Error
      return res.status(500).json({ error: error.message || 'An unexpected error occurred' });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 