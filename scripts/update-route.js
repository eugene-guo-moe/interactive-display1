const fs = require('fs');
const path = require('path');

const maskBase64 = fs.readFileSync(path.join(__dirname, 'mask-base64.txt'), 'utf8').trim();

const routeContent = `import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY!,
});

// Pre-generated 1080x1920 PNG mask (2x scale to match pixelRatio: 2)
// White circle at (540, 940) with radius 120 for icon badge area
const MASK_PNG_BASE64 = '${maskBase64}';

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

    // Upload image to FAL storage
    console.log('Uploading image to FAL storage...');
    const imageUrl = await fal.storage.upload(imageBlob);
    console.log('Image uploaded to FAL:', imageUrl);

    // Upload mask to FAL storage
    console.log('Uploading mask to FAL storage...');
    const maskBinaryString = atob(MASK_PNG_BASE64);
    const maskBytes = new Uint8Array(maskBinaryString.length);
    for (let i = 0; i < maskBinaryString.length; i++) {
      maskBytes[i] = maskBinaryString.charCodeAt(i);
    }
    const maskBlob = new Blob([maskBytes], { type: 'image/png' });
    const maskUrl = await fal.storage.upload(maskBlob);
    console.log('Mask uploaded to FAL:', maskUrl);

    const prompt = \`
Replace the masked area with a clean 3D handshake icon badge in muted mint-green/teal that matches the \${profileColor || 'green'} neon frame aesthetic.

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
\`.trim();

    console.log('Starting inpainting...');
    const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
      input: {
        image_url: imageUrl,
        mask_url: maskUrl,
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
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'app', 'api', 'inpaint-icon', 'route.ts'),
  routeContent
);

console.log('Route updated successfully');
