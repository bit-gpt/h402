"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useIsDarkMode } from "../components/ThemeProvider";

function HomeContent() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const isDarkMode = useIsDarkMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // This will trigger the 402 payment flow via middleware
      router.push(`/api/generate-image?prompt=${encodeURIComponent(prompt)}`);
    } catch (error) {
      console.error("Error submitting prompt:", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-[800px] mx-auto text-center">
        <h1 className="text-3xl font-bold mb-6">402 Pay Image Generation</h1>
        <p className="text-lg mb-8">
          Generate AI images using the HTTP 402 payment protocol.
        </p>
        
        <div className={`p-8 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
            <div>
              <label htmlFor="prompt" className={`block text-sm font-medium mb-2 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Image Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className={`w-full p-3 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300'}`}
                rows={4}
                disabled={isGenerating}
                required
                suppressHydrationWarning
              />
            </div>
            
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              suppressHydrationWarning
            >
              {isGenerating ? (
                <>
                  <svg className="inline-block animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                "Generate Image"
              )}
            </button>
            
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              This will trigger a payment request via the HTTP 402 protocol.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-[800px] mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">402 Pay Image Generation</h1>
          <p className="text-lg mb-8">
            Generate AI images using the HTTP 402 payment protocol.
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
