"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

export default function ImagePage() {
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading"
  );
  const [error, setError] = useState<string>("");

  return (
    <Suspense fallback={<div>Loading..</div>}>
      <ImageComponent
        status={status}
        error={error}
        setStatus={(status) => setStatus(status)}
        setError={(error) => setError(error)}
      />
    </Suspense>
  );
}

function ImageComponent({
  status,
  error,
  setStatus,
  setError,
}: {
  status: "loading" | "error" | "success";
  error: string;
  setStatus: (status: "loading" | "error" | "success") => void;
  setError: (error: string) => void;
}) {
  const searchParams = useSearchParams();
  const filename = searchParams.get("filename");
  const prompt = searchParams.get("prompt");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showLoadingText, setShowLoadingText] = useState(false);
  const attemptRef = useRef(1);
  const hasStartedFetchingRef = useRef(false);
  const hasStartedGenerationRef = useRef(false);

  // Handle image generation when a prompt is provided
  useEffect(() => {
    // Only proceed if we have a prompt and haven't started generation yet
    if (!prompt || hasStartedGenerationRef.current || requestId) {
      return;
    }

    hasStartedGenerationRef.current = true;

    const generateImage = async () => {
      try {
        // Since the middleware now protects the /image route directly,
        // if we're here, it means payment has already been made or is not required
        // We can directly call the API endpoint to start image generation
        // Note: The API endpoint is no longer protected by the middleware
        const response = await fetch(
          `/api/generate-image?prompt=${encodeURIComponent(prompt)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt }),
          }
        );

        if (!response.ok) {
          // Handle any non-payment errors
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${errorText}`);
        }

        // If we get here, the request was successful
        const data = await response.json();
        if (data.requestId) {
          console.log(
            "Image generation started with requestId:",
            data.requestId
          );
          setRequestId(data.requestId);
          // Now we'll start checking the status of the image generation
          await checkImageStatus(data.requestId, 15, 2000);
        } else {
          throw new Error("No requestId received from API");
        }
      } catch (error) {
        console.error("Error generating image:", error);
        setStatus("error");
        setError(error instanceof Error ? error.message : String(error));
      }
    };

    generateImage();
  }, [prompt, requestId, setError, setStatus]);

  useEffect(() => {
    console.log("Image page status:", status);
    if (status === "loading") {
      const timer = setTimeout(() => {
        setShowLoadingText(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Function to check image generation status
  const checkImageStatus = async (
    reqId: string,
    retriesLeft: number,
    delay: number
  ) => {
    try {
      console.log(`Checking image status (${retriesLeft} retries left)...`);
      const response = await fetch(`/api/generate-image/status/${reqId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "completed" && data.filename) {
        console.log("Image generation completed with filename:", data.filename);
        // Instead of redirecting, update the UI to show the image
        setStatus("success");
        // Use the window.history API to update the URL without a full page reload
        window.history.replaceState({}, "", `/image?filename=${data.filename}`);
        return;
      } else if (data.status === "failed") {
        throw new Error(data.error || "Image generation failed");
      } else if (data.status === "processing") {
        if (retriesLeft > 0) {
          // Continue checking after the specified delay
          setTimeout(
            () => checkImageStatus(reqId, retriesLeft - 1, delay),
            delay
          );
        } else {
          throw new Error("Timed out waiting for image generation");
        }
      } else {
        throw new Error(`Unknown status: ${data.status}`);
      }
    } catch (error) {
      console.error("Error checking image status:", error);
      if (retriesLeft > 0) {
        // Retry after the specified delay
        setTimeout(
          () => checkImageStatus(reqId, retriesLeft - 1, delay),
          delay
        );
      } else {
        setStatus("error");
        setError(error instanceof Error ? error.message : String(error));
      }
    }
  };

  // Handle displaying an image when a filename is provided
  useEffect(() => {
    // Check if we have a valid filename (not null, undefined, or empty string)
    const isValidFilename =
      filename && filename !== "null" && filename.trim() !== "";

    if (!isValidFilename || hasStartedFetchingRef.current) {
      if (!isValidFilename) {
        // Only show an error if we have no prompt and no valid filename
        if (!prompt) {
          console.error(
            "No valid filename or prompt provided in query parameters"
          );
          setStatus("error");
          setError("No valid filename or prompt provided");
        }
      }
      return;
    }

    hasStartedFetchingRef.current = true;
    console.log("Starting to check for image with filename:", filename);

    const checkImage = () => {
      const img = document.createElement("img"); // Create an HTMLImageElement
      const maximumAttempts = 60;

      img.onload = () => {
        console.log("Image found successfully");
        setStatus("success");
      };

      img.onerror = () => {
        console.log(
          `Image not found yet, attempt ${attemptRef.current}/${maximumAttempts}`
        );
        attemptRef.current += 1;
        if (attemptRef.current < maximumAttempts) {
          setTimeout(checkImage, 2000);
        } else {
          console.error(
            `Failed to load image after ${attemptRef.current} attempts`
          );
          setStatus("error");
          setError(`Image not found after multiple attempts`);
        }
      };

      // Add a cache-busting parameter to prevent browser caching
      img.src = `/uploads/${filename}?t=${Date.now()}`;
    };

    checkImage();
  }, [filename, prompt, setError, setStatus]);

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          {showLoadingText && (
            <p>Generating your image{filename ? `: ${filename}` : "..."}...</p>
          )}
        </div>
      </div>
    );
  }

  // Check if we have a valid filename before rendering
  const isValidFilename =
    filename && filename !== "null" && filename.trim() !== "";

  if (!isValidFilename) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>No valid image filename provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Using Next.js Image component for better performance */}
        <Image
          src={`/uploads/${filename}?t=${Date.now()}`}
          alt="AI Generated Image"
          width={1024}
          height={1024}
          className="max-w-full max-h-[90vh] object-contain"
          priority
        />
        {/* Debug information */}
        <div className="absolute bottom-2 left-2 text-white text-xs opacity-50">
          Image path: /uploads/{filename}
        </div>
      </div>
    </div>
  );
}
