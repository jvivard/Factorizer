# Social Media Fact Checker

A web application that allows users to upload screenshots of social media posts, extract text using OCR, and fact-check the extracted content using Perplexity's Sonar Pro API.

## Features

- Screenshot upload and preview
- Text extraction using Tesseract.js OCR
- Fact-checking with Perplexity Sonar Pro API
- Detailed analysis of claims with sources and citations
- Responsive, modern UI with Tailwind CSS
- Error handling and recovery
- User-friendly interface
- Daily content updates
- Mobile-responsive design

## Tech Stack

- **Frontend**: React, Tailwind CSS, Tesseract.js
- **Backend**: Node.js, Express
- **APIs**: Perplexity Sonar Pro API

## GitHub Repository

This project is maintained at: [https://github.com/jvivard/social-media-fact-checker](https://github.com/jvivard/social-media-fact-checker)

Feel free to contribute by submitting pull requests or reporting issues!

## Contributors

- [jvivard](https://github.com/jvivard) - Creator and maintainer

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Perplexity API key (get one from [Perplexity AI](https://www.perplexity.ai/))

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/jvivard/social-media-fact-checker.git
   cd social-fact-checker
   ```

2. Install backend dependencies:
   ```
   cd server
   npm install
   ```

3. Create a `.env` file in the server directory:
   ```
   PORT=5000
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```

4. Install frontend dependencies:
   ```
   cd ../client
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd server
   npm run dev
   ```

2. Start the frontend application:
   ```
   cd ../client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload a screenshot of a social media post
2. Click "Verify" to extract text and fact-check the content
3. Review the fact-check results, including overall rating, claims analysis, and sources

## Future Improvements

- Enhanced accuracy with multi-model verification
- Real-time social media integration
- Browser extension for instant fact-checking
- User accounts to save and track fact-checking history
- Additional language support

## License

MIT

## Acknowledgements

- [Perplexity AI](https://www.perplexity.ai/) for their Sonar Pro API
- [Tesseract.js](https://tesseract.projectnaptha.com/) for OCR capabilities
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/) 