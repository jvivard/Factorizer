import React, { useState } from "react";
import { createWorker } from "tesseract.js";
import { 
  Check, 
  Loader2, 
  AlertTriangle, 
  Upload,
  Search
} from "lucide-react";
import axios from "axios";

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [factCheckResults, setFactCheckResults] = useState(null);
  const [error, setError] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setShowResults(false); // Reset results when new file is uploaded
      setError(null); // Clear any previous errors
      setExtractedText(""); // Clear any previously extracted text
      setFactCheckResults(null); 

      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractTextFromImage = async (file) => {
    try {
      const worker = await createWorker({
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      
      const { data } = await worker.recognize(file);
      await worker.terminate();
      
      return data.text;
    } catch (error) {
      console.error("OCR Error:", error);
      throw new Error("Failed to extract text from image. Please try again with a clearer image.");
    }
  };

  const factCheckText = async (text) => {
    try {
      const response = await axios.post("/api/fact-check", {
        text: text
      });
      
      return response.data;
    } catch (error) {
      console.error("Fact-check API Error:", error);
      throw new Error(error.response?.data?.error || "Fact-check request failed. Please try again.");
    }
  };

  const handleVerify = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setError(null);
    setOcrProgress(0);

    try {
      // Extract text from image using Tesseract.js
      const text = await extractTextFromImage(uploadedFile);
      setExtractedText(text);
      
      if (!text || text.trim() === "") {
        throw new Error("No text could be extracted from the image. Please try with a clearer image.");
      }
      
      // Send the text to the backend for fact-checking
      const results = await factCheckText(text);
      setFactCheckResults(results);
      setShowResults(true);
    } catch (err) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to determine result color based on rating
  const getRatingColor = (rating) => {
    if (!rating) return "blue";
    
    const ratingLower = rating.toLowerCase();
    if (ratingLower.includes("true")) return "green";
    if (ratingLower.includes("false")) return "red";
    if (ratingLower.includes("misleading") || ratingLower.includes("mixed")) return "yellow";
    return "blue"; // default for uncertain or unverifiable
  };

  // Determine className for rating badges
  const getRatingClass = (rating) => {
    if (!rating) return "rating-unverifiable";
    
    const ratingLower = rating.toLowerCase();
    if (ratingLower.includes("true")) return "rating-true";
    if (ratingLower.includes("false")) return "rating-false";
    if (ratingLower.includes("misleading") || ratingLower.includes("mixed")) return "rating-misleading";
    return "rating-unverifiable";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">SOCIAL MEDIA</h1>
              <p className="text-sm text-gray-600 font-medium">FACT-CHECKER</p>
            </div>
          </div>
          <nav className="flex items-center gap-8">
            <a href="/" className="text-gray-700 hover:text-gray-900 font-medium">
              Home
            </a>
            <a href="/about" className="text-gray-700 hover:text-gray-900 font-medium">
              About
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Check the facts</h2>
          <p className="text-xl text-gray-600 mb-8">
            Upload a screenshot of a social media post to verify the information.
          </p>

          {/* Upload Form */}
          <div className="flex flex-col items-center gap-4 mb-12">
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-4">
                <img
                  src={imagePreview}
                  alt="Uploaded screenshot"
                  className="max-w-md max-h-64 rounded-lg border-2 border-gray-200 shadow-lg object-contain"
                />
              </div>
            )}

            <label htmlFor="screenshot-upload" className="cursor-pointer">
              <div className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors">
                <Upload className="w-6 h-6" />
                {uploadedFile ? "Replace Screenshot" : "Upload Screenshot"}
              </div>
              <input
                id="screenshot-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {/* Show uploaded file name */}
            {uploadedFile && <p className="text-sm text-gray-600">Uploaded: {uploadedFile.name}</p>}

            {/* Verify Button - only show when file is uploaded */}
            {uploadedFile && !isProcessing && (
              <button 
                onClick={handleVerify} 
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-lg font-medium"
              >
                <Search className="w-5 h-5" />
                Verify
              </button>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="flex flex-col items-center gap-3 text-blue-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg font-medium">
                  {ocrProgress > 0 ? `Extracting text (${ocrProgress}%)...` : "Analyzing screenshot..."}
                </span>
                
                {ocrProgress === 100 && (
                  <span className="text-sm text-gray-600">Fact-checking with Perplexity Sonar API...</span>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Extracted Text Section */}
          {extractedText && !error && (
            <div className="mb-8 px-4 py-3 bg-gray-100 rounded-lg text-left">
              <h3 className="font-bold text-gray-700 mb-2">Extracted Text:</h3>
              <p className="text-gray-600">{extractedText}</p>
            </div>
          )}
        </div>

        {/* Results Cards - only show after processing */}
        {showResults && factCheckResults && (
          <div className="mb-12">
            {/* Overall Rating */}
            {factCheckResults.overall_rating && (
              <div className="mb-8">
                <div className={`border rounded-lg p-6 ${getRatingClass(factCheckResults.overall_rating)}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Overall Rating</h3>
                    <span className="px-3 py-1 rounded-full bg-white font-bold">
                      {factCheckResults.overall_rating}
                    </span>
                  </div>
                  {factCheckResults.summary && (
                    <div className="text-lg">{factCheckResults.summary}</div>
                  )}
                </div>
              </div>
            )}

            {/* Individual Claims */}
            {factCheckResults.claims && factCheckResults.claims.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-4 text-left">Claims Analysis</h3>
                <div className="space-y-6">
                  {factCheckResults.claims.map((claim, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className={`p-4 ${getRatingClass(claim.rating)}`}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold">Claim {index + 1}</h4>
                          <span className="px-3 py-1 rounded-full bg-white font-bold">
                            {claim.rating}
                          </span>
                        </div>
                        <p className="mt-1 text-lg font-medium">{claim.claim}</p>
                      </div>
                      <div className="bg-white p-4">
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-700 mb-2">Explanation:</h5>
                          <p className="text-gray-800">{claim.explanation}</p>
                        </div>
                        {claim.sources && claim.sources.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Sources:</h5>
                            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
                              {claim.sources.map((source, sourceIdx) => (
                                <li key={sourceIdx}>
                                  {source.startsWith('http') ? (
                                    <a href={source} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                      {source}
                                    </a>
                                  ) : (
                                    source
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {factCheckResults.citations && factCheckResults.citations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-2xl font-bold mb-4 text-left">Citations</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-white p-4">
                    <ul className="divide-y divide-gray-200">
                      {factCheckResults.citations.map((citation, index) => (
                        <li key={index} className="py-3 first:pt-0 last:pb-0">
                          <p className="font-medium">[{index + 1}] {citation.title || "Source"}</p>
                          <a 
                            href={citation.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {citation.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">Social Media Fact-Checker</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Powered by Perplexity Sonar API and Tesseract.js
              </p>
            </div>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-gray-300 hover:text-white">Privacy</a>
              <a href="/terms" className="text-gray-300 hover:text-white">Terms</a>
              <a href="/contact" className="text-gray-300 hover:text-white">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 
