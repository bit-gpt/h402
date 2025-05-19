import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

/**
 * Protected API route for image generation
 * This route is protected by the h402 middleware
 * Users must make a payment to access this route
 */
export async function GET(request: NextRequest) {
  // For GET requests, we'll redirect to the paywall page
  // The middleware will handle the payment flow
  // After payment, the user will be redirected back to this endpoint with a POST request

  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt");

  if (!prompt) {
    return NextResponse.json({
      error: "Missing prompt parameter"
    }, { status: 400 });
  }

  // The middleware will intercept this request and redirect to the paywall
  // We don't need to do anything special here
  // After payment, the PaymentUI component will make a POST request to this endpoint

  // This code will only run if the middleware doesn't intercept the request
  // (e.g., if the user has already paid)
  console.log("GET request to generate-image with prompt:", prompt);

  return NextResponse.json({
    message: "Please use POST method for image generation"
  }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    // The middleware has already verified the payment
    // You can access payment information from the X-PAYMENT-RESPONSE header
    const paymentResponse = request.headers.get("X-PAYMENT-RESPONSE");

    // Parse the payment response
    let paymentInfo = null;
    if (paymentResponse) {
      try {
        paymentInfo = JSON.parse(paymentResponse);
        console.log("Payment info:", paymentInfo);
      } catch (error) {
        console.error("Error parsing payment response:", error);
        // Continue execution even if payment info parsing fails
        // The middleware should have already verified the payment
      }
    }

    // Get prompt from query parameters or request body
    const url = new URL(request.url);
    let prompt = url.searchParams.get("prompt");

    // If prompt is not in query parameters, try to get it from request body
    if (!prompt) {
      try {
        const requestBody = await request.json();
        prompt = requestBody.prompt;
        console.log("Request body:", requestBody);
      } catch (error) {
        console.error("Error parsing request body:", error);
      }
    }

    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: "Missing prompt",
        message: "Please provide a prompt for image generation"
      }, { status: 400 });
    }

    console.log("Generating image with prompt:", prompt);

    // Generate a unique request ID for this image generation
    const requestId = generateRequestId();

    // Start the image generation process in the background
    generateImageInBackground(prompt, requestId).catch(error => {
      console.error("Background image generation failed:", error);
    });

    // Return accepted status with requestId
    return NextResponse.json({
      success: true,
      message: "Image generation started",
      requestId
    }, { status: 202 });
  } catch (error) {
    console.error("Unexpected error in POST handler:", error);
    return NextResponse.json({
      success: false,
      error: "Server error",
      message: "An unexpected error occurred"
    }, { status: 500 });
  }
}

// Generate a secure request ID
function generateRequestId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Function to generate the image in the background
async function generateImageInBackground(prompt: string, requestId: string) {
  try {
    // Generate image using OpenAI
    const openaiClient = openai();

    // Call OpenAI API to generate image
    const response = await openaiClient.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("Failed to generate image: No image URL returned from OpenAI");
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Validate the image content
    if (!imageBuffer || imageBuffer.byteLength === 0) {
      throw new Error("Downloaded image is empty");
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Save the image with the filename based on requestId
    const generatedImageFilename = `image-${requestId}.png`;
    const imagePath = path.join(uploadsDir, generatedImageFilename);

    await fs.writeFile(imagePath, Buffer.from(imageBuffer));
    console.log(`Image saved to ${imagePath}`);

    // Could add additional logic here to store the status in a database
    // for better persistence and error handling
  } catch (error) {
    console.error("Error in generateImageInBackground:", error);
    // In a production environment, you might want to store the error
    // so it can be returned when the client checks the status

    // Could write an error file or update a database with the error status
    try {
      const errorLogDir = path.join(process.cwd(), "logs");
      await fs.mkdir(errorLogDir, { recursive: true });
      await fs.writeFile(
        path.join(errorLogDir, `error-${requestId}.json`),
        JSON.stringify({
          requestId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
      );
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT, X-PAYMENT-RESPONSE',
    },
  });
}
