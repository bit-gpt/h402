import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import path from "path";
import fs from "fs/promises";
import { getHost } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const prompt = searchParams.get("prompt");
  const base64Payment = searchParams.get("402base64");

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Verify payment is included
  if (!base64Payment) {
    return NextResponse.json(
      { error: "Payment information is required" },
      { status: 400 }
    );
  }

  const filename = `${crypto.randomUUID()}.png`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filepath = path.join(uploadsDir, filename);

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
    return NextResponse.json(
      { error: "Failed to create uploads directory" },
      { status: 500 }
    );
  }

  try {
    // In a real implementation, you would verify the payment here using the base64Payment
    // For this example, we'll just log it
    console.log("Processing payment:", base64Payment);

    const imageResponse = await openai().images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });

    if (imageResponse.data?.[0]?.url) {
      const response = await fetch(imageResponse.data[0].url);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(filepath, Buffer.from(buffer));
    } else if (imageResponse.data?.[0]?.b64_json) {
      const base64Image = imageResponse.data[0].b64_json;
      await fs.writeFile(filepath, Buffer.from(base64Image, "base64"));
    } else {
      throw new Error("No image data received from OpenAI");
    }

    // Only redirect after the image has been successfully saved
    const host = getHost(request);
    const redirectUrl = new URL(
      `/image?filename=${filename}`,
      `${request.nextUrl.protocol}//${host}`
    );

    console.log("Redirecting to:", redirectUrl.toString());

    // Use a 303 redirect to ensure it's treated as a GET request
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("Error generating or saving image:", error);
    return NextResponse.json(
      { error: "Failed to generate or save image" },
      { status: 500 }
    );
  }
}
