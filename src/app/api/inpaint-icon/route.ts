import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { cardImageBase64, profileColor, profileEmoji } = await request.json();

    if (!cardImageBase64) {
      return NextResponse.json({ error: "Missing card image" }, { status: 400 });
    }

    // Convert base64 data URL to Blob for upload
    const base64Data = cardImageBase64.startsWith('data:')
      ? cardImageBase64.split(',')[1]
      : cardImageBase64;

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const imageBlob = new Blob([bytes], { type: 'image/png' });

    // Upload to FAL storage
    console.log('Uploading image to FAL storage...');
    const imageUrl = await fal.storage.upload(imageBlob);
    console.log('Image uploaded to FAL:', imageUrl);

    // Create mask - white rectangle where icon should be (bottom center of image area)
    // Card is 540x960, image area starts at ~y=70 and ends at ~y=470
    // Icon should be at bottom center of image, overlapping edge
    const maskCanvas = createMaskDataUrl(540, 960);

    const prompt = `
Replace the masked area with a clean 3D handshake icon badge in muted mint-green/teal that matches the ${profileColor || 'green'} neon frame aesthetic.

The badge must look like a UI element integrated into the design:
- soft realistic shadow underneath
- subtle glow similar to the photo frame border
- crisp edges, premium look
- centered at the bottom edge of the photo
- slightly overlaps the bottom edge of the rounded photo frame (like a badge attached to the frame)

IMPORTANT:
- Do NOT change the portrait, background, photo, or layout.
- Do NOT change any text.
- Only add the 3D handshake icon badge in the masked area.
- The icon should be a stylized handshake, not an emoji.
`.trim();

    console.log('Starting inpainting...');
    const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
      input: {
        image_url: imageUrl,
        mask_url: maskCanvas,
        prompt,
        num_images: 1,
      },
    });

    // Get the result image URL
    const resultData = result.data as { images?: { url: string }[] };
    const outputUrl = resultData?.images?.[0]?.url;
    console.log('Inpainting result:', outputUrl ? 'success' : 'no output');

    if (!outputUrl) {
      console.error("No output from FAL inpainting:", JSON.stringify(result));
      return NextResponse.json({ error: "Inpainting failed" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl: outputUrl });

  } catch (error) {
    console.error("Inpainting error:", error);
    return NextResponse.json(
      { error: "Inpainting failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Create a mask image as data URL
// White = area to inpaint, Black = area to preserve
function createMaskDataUrl(width: number, height: number): string {
  // We need to create a mask where the icon badge area is white
  // Card layout: logo at top, image from ~y=70 to ~y=470, then text
  // Icon badge should be at bottom center of image, overlapping
  // Badge position: centered horizontally, at y ~= 450-500 (overlapping image bottom)

  // Create SVG mask
  const iconX = width / 2;
  const iconY = 470; // Bottom of image area
  const iconSize = 60; // Size of icon area to inpaint

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="black"/>
      <circle cx="${iconX}" cy="${iconY}" r="${iconSize}" fill="white"/>
    </svg>
  `;

  // Use btoa for edge runtime (no Buffer available)
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}
