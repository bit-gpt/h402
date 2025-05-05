"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
  const [showLoadingText, setShowLoadingText] = useState(false);
  const attemptRef = useRef(1);
  const hasStartedFetchingRef = useRef(false);

  // Debug log the filename parameter
  useEffect(() => {
    console.log("Image page received filename:", filename);
  }, [filename]);

  useEffect(() => {
    if (status === "loading") {
      const timer = setTimeout(() => {
        setShowLoadingText(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (!filename || hasStartedFetchingRef.current) {
      if (!filename) {
        console.error("No filename provided in query parameters");
        setStatus("error");
        setError("No filename provided");
      }
      return;
    }

    hasStartedFetchingRef.current = true;

    const checkImage = () => {
      const img = new Image();
      const maximumAttempts = 60;

      img.onload = () => {
        console.log("Image found successfully");
        setStatus("success");
      };

      img.onerror = () => {
        console.log(`Image not found yet, attempt ${attemptRef.current}/${maximumAttempts}`);
        attemptRef.current += 1;
        if (attemptRef.current < maximumAttempts) {
          setTimeout(checkImage, 2000);
        } else {
          console.error(`Failed to load image after ${attemptRef.current} attempts`);
          setStatus("error");
          setError(`Image not found after multiple attempts`);
        }
      };

      // Add a cache-busting parameter to prevent browser caching
      img.src = `/uploads/${filename}?t=${Date.now()}`;
    };

    checkImage();
  }, [filename, setError, setStatus]);

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
          {showLoadingText && <p>Generating your image{filename ? `: ${filename}` : '...'}...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Replace Image component with a more reliable approach */}
        <img
          src={`/uploads/${filename}?t=${Date.now()}`}
          alt="AI Generated Image"
          className="max-w-full max-h-[90vh] object-contain"
        />
        {/* Debug information */}
        <div className="absolute bottom-2 left-2 text-white text-xs opacity-50">
          Image path: /uploads/{filename}
        </div>
      </div>
    </div>
  );
}
