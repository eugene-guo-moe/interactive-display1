import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY!,
});

// Pre-generated 540x960 PNG mask with white circle at bottom center of image area
// Generated using: black background, white circle at (270, 470) with radius 60
// This is a proper PNG to ensure FAL.ai compatibility
const MASK_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAhwAAAPACAYAAAB+daCcAAAABmJLR0QA/wD/AP+gvaeTAAAct0lEQVR4nO3dX2yfdd3/8XfnxoABsnUwYRt6YDqRRDNxW+jKhDFxEeZYdMaoy4LEA2M0xHikJ5BojDEcIImJCcQEiEGCCiHyRxgM3D+sg6CJbHDioGyRrJviHBuF9j74mV+8zX17I1yvftpvH4/kc7zXeiXtc9d17du+qpooAICgWa0HAAC9T3AAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgTnAAAHGCAwCIExwAQJzgAADiBAcAECc4AIA4wQEAxAkOACBOcAAAcYIDAIgTHABAnOAAAOIEBwAQJzgAgDjBAQDECQ4AIE5wAABxggMAiBMcAECc4AAA4gQHABAnOACAOMEBAMQJDgAgbnbrAcDUcNppp9XAwEANDAzUsmXLatmyZbV48eLq7++v/v7+Ov3002vu3Ll1+umnV1XV8ePH6+TJk3X8+PEaHR2t0dHRevnll2vfvn31/PPP1/PPP1/79++vEydONP6bAVNBX1VNtB4BTK6+vr764Ac/WGvXrq3LL7+8li9fXhdccEHNmtXtTc/x8fF68cUX6+mnn67HH3+8HnvssfrjH//Y6Z8BTA+CA2aIRYsW1caNG2vt2rV12WWX1aJFi5rs+POf//z/4+O+++6rV155pckOYHIJDuhhc+fOrSuvvLK2bNlS11xzTc2ZM6f1pP/mzTffrMcff7zuuOOOuueee+r48eOtJwEhggN60KpVq+q6666rzZs319lnn916zlvyl7/8pe6+++669dZba3h4uPUcIGDCcZzeOENDQxP333//xHS3Y8eOiQ0bNjT/ejqO0+lpPsBxnHd41q1bN7F79+7WndC5p59+emLz5s0TfX19zb/GjuO8s+ORCkxjq1evrltuuaWWL1/eekrU3r1762tf+1rt3r279RTgbfLBXzANLViwoG6++eZ68sknez42qqouvvji2rlzZ91+++11zjnntJ4DvA3ucMA00tfXV1u2bKmbbrqpFi5c2HpOE0ePHq0bb7yxbrnllhofH289B3iLBAdME+9973vrpz/9aQ0ODrae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';

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

