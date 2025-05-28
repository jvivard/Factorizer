# Social Media Fact Checker Extension

A browser extension that fact-checks social media posts in real-time using the Perplexity Sonar API.

## Features

- Directly fact-check posts on popular social media platforms
- Inline fact-checking results with detailed analysis
- Support for major platforms (Twitter/X, Facebook, Instagram, LinkedIn, TikTok)
- Customizable settings and preferences
- Privacy-focused (all data stored locally)
- Built using Manifest V3 for modern browsers

## Installation

### Development Build

1. Clone the repository:
   ```
   git clone https://github.com/jvivard/social-media-fact-checker.git
   cd social-fact-checker/extension
   ```

2. Load the extension in your browser:
   
   **Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `extension` directory

   **Firefox:**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select any file in the `extension` directory

   **Edge:**
   - Open Edge and navigate to `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension` directory

3. Configure the extension:
   - Click the extension icon to open the popup
   - Click "Options" to open the settings page
   - Enter your Perplexity API key and adjust other settings

## Usage

1. Visit any supported social media platform
2. The extension will automatically add fact-check buttons to posts
3. Click the "Fact Check" button on any post to analyze its claims
4. View the fact-check results inline, including overall rating and specific claims analysis

### Keyboard Shortcuts

- `Alt+F` - Fact-check the currently selected/focused post
- `Alt+X` - Toggle extension on/off

## API Requirements

This extension requires a Perplexity API key to function. You can get one from [Perplexity AI](https://www.perplexity.ai/).

The extension uses the following API endpoint:
- `https://api.perplexity.ai/chat/completions`

## Privacy Information

This extension:
- Only accesses the content you explicitly choose to fact-check
- Stores all data locally on your device only
- Doesn't track your browsing history or behavior
- Only communicates with the Perplexity API when performing a fact-check

## Technical Information

- Built with vanilla JavaScript for maximum performance
- Uses Manifest V3 for compatibility with modern browser requirements
- Modular architecture for easy maintenance and feature addition
- Content script isolates extension code from website scripts

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please make sure your code follows our style guide and passes all tests.

## License

MIT

## Credits

- [Perplexity AI](https://www.perplexity.ai/) for their Sonar API
- [Lucide](https://lucide.dev/) for SVG icons 