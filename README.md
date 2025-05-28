# FACTORIZER - AI-Powered Fact-Checking Browser Extension

**FACTORIZER: Instantly verify your social feed.**

FACTORIZER is a browser extension designed to help you quickly and easily fact-check information you encounter on popular social media platforms. It leverages the power of AI through the Perplexity API to provide ratings, explanations, and sources for claims found in text and images.

## Features

*   **Inline Fact-Checking:** Adds "Fact Check" buttons directly to posts on supported social media platforms.
*   **Image Fact-Checking:** Right-click on an image containing text to extract the text (via OCR.space API) and get a fact-check.
*   **Selected Text Fact-Checking:** Right-click on any selected text on a webpage to initiate a fact-check.
*   **AI-Powered Analysis:** Utilizes the Perplexity API to provide:
    *   A clear rating (e.g., True, Mostly False, Mixed).
    *   A concise explanation of the rating.
    *   Links to supporting sources.

*   **Customizable Options:**
    *   Configure your Perplexity API key.
    *   Configure your OCR.space API key (for image checking).
    *   Toggle display preferences.
*   **Result Caching:** Caches recent fact-checks to improve speed and reduce API calls.
*   **User-Friendly Interface:** Clean popup for statistics and quick settings, and a dedicated options page.

## Project Structure

The entire FACTORIZER project is contained within the `/extension` directory:

*   `manifest.json`: Defines the extension's properties, permissions, and components.
*   `background.js`: Service worker handling API calls, context menu logic, caching, and core operations.
*   `content.js`: Injected into web pages to interact with social media content, add buttons, and display results.
*   `content.css`: Styles for the UI elements injected by `content.js`.
*   `popup.html`, `popup.js`, `popup.css` (inline): UI for the browser action popup.
*   `options.html`, `options.js`, `options.css` (inline): UI for the extension's settings page.
*   `/icons`: Contains the extension's icons in various sizes.
*   `test.html`: A local page for testing context menu functionality.

This project **does not** require a separate client or server component to run; it operates entirely as a browser extension.

## Getting Started

### Prerequisites

*   Google Chrome (or a Chromium-based browser that supports Manifest V3 extensions).
*   A Perplexity AI API key. You can get one from [Perplexity AI](https://docs.perplexity.ai/docs/getting-started).
*   (Optional, for image fact-checking) An OCR.space API key. A free key is available at [OCR.space](https://ocr.space/ocrapi).

### Installation

1.  **Clone or Download the Repository:**
    ```bash
    git clone https://github.com/jvivard/Factorizer.git
    cd Factorizer
    ```
    *(If you downloaded a ZIP, extract it.)*

2.  **Load the Extension in Chrome:**
    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable **Developer mode** using the toggle switch in the top-right corner.
    *   Click the **"Load unpacked"** button.
    *   Navigate to the directory where you cloned/extracted the project and select the `extension` sub-directory (i.e., the directory containing `manifest.json`).

3.  **Configure API Keys:**
    *   Once loaded, click on the FACTORIZER extension icon in your browser toolbar.
    *   Click "Open Options".
    *   Enter your Perplexity API key.
    *   Enter your OCR.space API key if you want to use the image fact-checking feature.
    *   Save your settings.

### Usage

*   **Inline Buttons:** Browse supported social media sites. FACTORIZER should automatically add "Fact Check" buttons to text. Click these to get an analysis.
*   **Image Right-Click:** Right-click on an image on any webpage. If it contains text, select "Fact check this image" from the context menu.
*   **Text Selection Right-Click:** Select any text on a webpage, right-click, and choose "Fact check selected text".
*   **Popup:** Click the FACTORIZER icon in your toolbar to view statistics, access quick settings, or go to the main options page.
*    ***NOTE***: Fact check on images is still in devleopment!!

## Built With

*   **Languages:** JavaScript (ES6+), HTML5, CSS3
*   **Platform:** Google Chrome (Manifest V3 Extension)
*   **APIs:**
    *   Perplexity AI API (model: `sonar`)
    *   OCR.space API
    *   Chrome Extension APIs (`storage`, `contextMenus`, `runtime`, `scripting`)
*   **Tools:** Git, GitHub

## About This Project

### Inspiration

In an era of information overload, FACTORIZER was created to provide a simple, accessible tool for verifying information directly within social media feeds, empowering users to make more informed decisions.


## Contributing

While this project was developed as a demonstration, contributions or suggestions are welcome! Feel free to open an issue or submit a pull request if you have ideas for improvements.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details (if one is added, otherwise assume MIT). 
