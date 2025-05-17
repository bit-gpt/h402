import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

/**
 * Unprotected API route for checking image generation status
 * This route is not protected by the h402 middleware since payment was already verified
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;

  // Validate requestId to prevent directory traversal
  if (!isValidRequestId(requestId)) {
    return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
  }

  try {
    const publicDir = path.join(process.cwd(), "public", "uploads");
    const imagePattern = new RegExp(`^image-${requestId}.*\.png$`);
    const errorFile = path.join(publicDir, `error-${requestId}.txt`);

    // First check if the directory exists
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
      return NextResponse.json({ status: "processing" });
    }

    // Check for completed image
    const files = await fs.readdir(publicDir);
    const imageFile = files.find((file) => imagePattern.test(file));
    if (imageFile) {
      return NextResponse.json({
        status: "completed",
        filename: imageFile,
      });
    }

    // Check for error file
    let errorExists = false;
    try {
      await fs.access(errorFile);
      errorExists = true;
    } catch {
      // Error file doesn't exist, which is expected during processing
    }

    if (errorExists) {
      const error = await fs.readFile(errorFile, "utf-8");
      return NextResponse.json({
        status: "failed",
        error,
      });
    }

    // If neither image nor error file exists, the request is still processing
    return NextResponse.json({ status: "processing" });
  } catch (error) {
    console.error("Error checking image status:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Validate requestId to prevent directory traversal
function isValidRequestId(requestId: string): boolean {
  return /^[a-f0-9]{32}$/.test(requestId);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
