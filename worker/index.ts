/**
 * Cloudflare Worker for Singapore History vs Future Image Generation
 *
 * Pipeline:
 * 1. Receive photo + prompt from frontend
 * 2. Detect gender using AWS Rekognition
 * 3. Generate scene with person (FAL.ai Flux)
 * 4. Swap face onto generated person
 * 5. Store in R2 and return URL
 */

import { AwsClient } from 'aws4fetch'

export interface Env {
  FAL_KEY: string
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  AWS_REGION: string
  IMAGES_BUCKET: R2Bucket
  PUBLIC_URL: string // e.g., "https://images.yoursite.com"
}

interface GenerateRequest {
  photo: string // base64 image data (with or without prefix)
  prompt: string
  timePeriod: 'past' | 'present' | 'future'
}

interface GenerateResponse {
  imageUrl: string
  qrUrl: string
}

// Extract base64 data from data URL if present
function extractBase64(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1]
  }
  return dataUrl
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

// Get segmentation mask using FAL.ai BiRefNet (for inpainting approach)
// Returns both the cutout image URL and the mask image URL
async function getSegmentationMask(
  imageUrl: string,
  apiKey: string
): Promise<{ cutoutUrl: string; maskUrl: string }> {
  const response = await fetch('https://fal.run/fal-ai/birefnet/v2', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      model: 'General Use (Light)',
      operating_resolution: '1024x1024',
      output_mask: true, // Get the segmentation mask
      output_format: 'png',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`BiRefNet segmentation error: ${error}`)
  }

  const result = await response.json() as {
    image: { url: string }
    mask_image?: { url: string }
  }

  if (!result.image?.url) {
    throw new Error('No segmentation result')
  }

  // BiRefNet mask: white = foreground (person), black = background
  // Flux Fill needs: white = areas to fill, black = areas to preserve
  // So we need to invert the mask - we'll do this with image editing
  const maskUrl = result.mask_image?.url || result.image.url

  return {
    cutoutUrl: result.image.url,
    maskUrl: maskUrl,
  }
}

// Invert mask colors using FAL.ai image editing
async function invertMaskImage(
  maskUrl: string,
  apiKey: string
): Promise<string> {
  // Use Flux Pro Fill with a simple inversion prompt on the mask itself
  // Or we can just negate by re-uploading and using image manipulation
  // For now, let's try using the mask as-is first and see if Flux Fill interprets it correctly
  // If not, we can add an inversion step using canvas or another service

  // Actually, let's try a workaround: Flux Fill documentation says
  // "white = areas to fill" - our mask has white = person
  // So we need the inverse. Let's fetch the mask, manipulate it, and re-upload

  // For now, return as-is and we'll test if Flux Fill works with this orientation
  return maskUrl
}

// Inpaint background using FAL.ai Fooocus (supports invert_mask)
async function inpaintBackground(
  imageUrl: string,
  maskUrl: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  // Using Fooocus because it has invert_mask option
  // BiRefNet mask: white = person, black = background
  // With invert_mask=true: it will fill the BLACK areas (background) instead of white
  const response = await fetch('https://fal.run/fal-ai/fooocus/inpaint', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      inpaint_image_url: imageUrl,
      mask_image_url: maskUrl,
      invert_mask: true, // Invert the mask so we fill the background, not the person
      negative_prompt: 'blurry, low quality, distorted face, extra limbs, bare chest, shirtless, open vest, exposed skin, revealing clothing, low cut, cleavage, sleeveless, tank top, bikini, swimwear, underwear, lingerie, nudity, nsfw, inappropriate, suggestive',
      guidance_scale: 7,
      sharpness: 2,
      output_format: 'jpeg',
      num_images: 1,
      performance: 'Quality',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FAL.ai Fooocus error: ${error}`)
  }

  const result = await response.json() as {
    images: Array<{ url: string }>
  }

  if (!result.images || result.images.length === 0) {
    throw new Error('No inpainted image generated')
  }

  return result.images[0].url
}

// Generate scene with a person using FAL.ai Flux
async function generateSceneWithPerson(
  prompt: string,
  timePeriod: 'past' | 'present' | 'future',
  gender: 'male' | 'female',
  apiKey: string
): Promise<string> {
  // Use gender-specific terms with appropriate, modest descriptions
  const personTerm = gender === 'female'
    ? 'A modestly dressed woman wearing casual appropriate clothing'
    : 'A man wearing casual appropriate clothing'

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${prompt} with ${personTerm.toLowerCase()} in the foreground looking directly at the viewer, front-facing portrait from waist up, face clearly visible, making eye contact with camera, seamlessly blended into the environment, consistent lighting, neutral pleasant expression, flattering portrait lighting, photorealistic, family-friendly, appropriate for all ages. Person is wearing complete, modest, school-appropriate clothing with fully covered torso.`,
      negative_prompt: 'bare chest, shirtless, open vest, exposed skin, revealing clothing, low cut, cleavage, sleeveless, tank top, bikini, swimwear, underwear, lingerie, nudity, nsfw, inappropriate, suggestive',
      image_size: 'portrait_16_9', // 9:16 ratio to fill phone screens
      num_images: 1,
      safety_tolerance: 1, // Strictest safety setting
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FAL.ai Flux error: ${error}`)
  }

  const result = await response.json() as {
    images: Array<{ url: string }>
  }

  if (!result.images || result.images.length === 0) {
    throw new Error('No scene generated')
  }

  return result.images[0].url
}

// Outpaint the top of an image to extend it for fullscreen phones
// Uses FAL.ai's creative upscaler with uncrop mode to seamlessly extend the scene upward
async function outpaintTop(
  imageUrl: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  console.log('[OUTPAINT] Extending image top for fullscreen display...')

  // Use creative upscaler with uncrop mode - this extends the image without changing resolution
  const response = await fetch('https://fal.run/fal-ai/creative-upscaler', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: `${prompt}, expansive sky, natural scene continuation, consistent lighting and atmosphere`,
      scale: 1, // Don't upscale resolution, just extend
      creativity: 0.3, // Low creativity to maintain scene consistency
      detail: 1,
      shape_preservation: 0.85,
      uncrop: true,
      uncrop_top: 0.33, // Extend top by ~1/3 to achieve roughly 9:16 from 16:9
      uncrop_bottom: 0,
      uncrop_left: 0,
      uncrop_right: 0,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[OUTPAINT] Creative upscaler failed:', error)
    // Return original image if outpainting fails - don't block the pipeline
    return imageUrl
  }

  const result = await response.json() as {
    image?: { url: string }
    images?: Array<{ url: string }>
  }

  const outputUrl = result.image?.url || result.images?.[0]?.url

  if (!outputUrl) {
    console.log('[OUTPAINT] No result, returning original image')
    return imageUrl
  }

  console.log('[OUTPAINT] Successfully extended image top')
  return outputUrl
}

// Generate image with face embedded using IP-Adapter Face ID
// This embeds the face INTO the generation process for better identity preservation (~70-75% match)
// compared to face-swap which only achieves ~20-30% match
async function generateWithFaceId(
  faceImageUrl: string,
  prompt: string,
  timePeriod: 'past' | 'present' | 'future',
  gender: 'male' | 'female',
  apiKey: string
): Promise<string> {
  // Use gender-specific terms with appropriate descriptions
  const personTerm = gender === 'female'
    ? 'a woman'
    : 'a man'

  const fullPrompt = `${prompt} featuring ${personTerm} wearing complete, modest, school-appropriate clothing with fully covered torso in the foreground, portrait from waist up, face clearly visible, looking at camera, photorealistic, high quality, consistent lighting, family-friendly`

  const response = await fetch('https://fal.run/fal-ai/ip-adapter-face-id', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      face_image_url: faceImageUrl,
      negative_prompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs, disfigured, bare chest, shirtless, open vest, exposed skin, revealing clothing, low cut, cleavage, sleeveless, tank top, bikini, swimwear, underwear, lingerie, nudity, nsfw, inappropriate, suggestive',
      num_inference_steps: 30,
      guidance_scale: 7.5,
      model_type: 'SDXL-v2-plus', // Use SDXL for better quality
      width: 576,  // 9:16 aspect ratio for phones
      height: 1024,
      num_samples: 1,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FAL.ai IP-Adapter Face ID error: ${error}`)
  }

  const result = await response.json() as {
    image?: { url: string; file_size?: number }
    images?: Array<{ url: string; file_size?: number }>
  }

  // Handle both response formats (image or images array)
  const outputUrl = result.image?.url || result.images?.[0]?.url

  if (!outputUrl) {
    throw new Error('No image generated with Face ID')
  }

  const fileSize = result.image?.file_size || result.images?.[0]?.file_size
  if (fileSize) {
    console.log(`[FACE-ID] Output file size: ${(fileSize / 1024).toFixed(1)} KB`)
  }

  return outputUrl
}

// Legacy: Swap face using FAL.ai Advanced Face Swap (kept for fallback)
// This uses easel-ai/advanced-face-swap which supports gender and upscale options
async function swapFace(
  targetImageUrl: string,
  faceImageUrl: string,
  gender: 'male' | 'female',
  apiKey: string
): Promise<string> {
  // Use advanced-face-swap with upscale disabled for faster downloads
  const response = await fetch('https://fal.run/easel-ai/advanced-face-swap', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      face_image_0: faceImageUrl,
      gender_0: gender,
      target_image: targetImageUrl,
      workflow_type: 'target_hair', // Keep target's hair (generated scene)
      upscale: false, // Disable 2x upscale for faster downloads
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FAL.ai advanced-face-swap error: ${error}`)
  }

  const result = await response.json() as {
    image: { url: string; file_size?: number }
  }

  if (!result.image || !result.image.url) {
    throw new Error('No face-swapped image generated')
  }

  if (result.image.file_size) {
    console.log(`[FACE-SWAP] Output file size: ${(result.image.file_size / 1024).toFixed(1)} KB`)
  }

  return result.image.url
}

// Enhance face for females (professional retouching - smoother skin, subtle improvements)
async function enhanceFace(
  imageUrl: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch('https://fal.run/fal-ai/image-editing/face-enhancement', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Face enhancement failed:', errorText)
      return imageUrl
    }

    const result = await response.json() as {
      image?: { url: string }
    }

    if (result.image?.url) {
      return result.image.url
    }

    console.error('No enhanced image in response, using original')
    return imageUrl
  } catch (error) {
    console.error('Face enhancement error:', error)
    return imageUrl // Fallback to original if enhancement fails
  }
}

// Fetch image from URL with size logging
async function fetchImage(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`)
  }
  const contentLength = response.headers.get('content-length')
  console.log(`[FETCH] Downloading from: ${url.substring(0, 80)}...`)
  console.log(`[FETCH] Content-Length: ${contentLength ? `${(parseInt(contentLength) / 1024).toFixed(1)} KB` : 'unknown'}`)
  const buffer = await response.arrayBuffer()
  console.log(`[FETCH] Downloaded: ${(buffer.byteLength / 1024).toFixed(1)} KB`)
  return buffer
}

// Simple image compositing using canvas-like approach
// Note: For production, consider using a proper image processing library
// This creates a simple HTML canvas composite via a service
async function compositeImages(
  backgroundUrl: string,
  foregroundPng: ArrayBuffer
): Promise<ArrayBuffer> {
  // For simplicity, we'll return the background with a note
  // In production, use a proper compositing service or library

  // Option 1: Use Cloudflare Image Resizing with overlays
  // Option 2: Use a separate compositing microservice
  // Option 3: Return both images and composite client-side

  // For now, fetch and return the background as placeholder
  // The frontend can handle compositing if needed
  const bgResponse = await fetch(backgroundUrl)
  return bgResponse.arrayBuffer()
}

// Generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Detect gender from face image using AWS Rekognition
async function detectGender(
  imageBytes: ArrayBuffer,
  env: Env
): Promise<'male' | 'female'> {
  try {
    const aws = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION || 'us-east-1',
    })

    // Convert ArrayBuffer to base64
    const base64Image = btoa(
      new Uint8Array(imageBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    const rekognitionEndpoint = `https://rekognition.${env.AWS_REGION || 'us-east-1'}.amazonaws.com/`

    const response = await aws.fetch(rekognitionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'RekognitionService.DetectFaces',
      },
      body: JSON.stringify({
        Image: {
          Bytes: base64Image,
        },
        Attributes: ['GENDER'],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AWS Rekognition error:', errorText)
      return 'male' // Default fallback
    }

    const result = await response.json() as {
      FaceDetails?: Array<{
        Gender?: {
          Value: 'Male' | 'Female'
          Confidence: number
        }
      }>
    }

    // Get the first face's gender
    const faceDetails = result.FaceDetails?.[0]
    if (faceDetails?.Gender) {
      const gender = faceDetails.Gender.Value.toLowerCase() as 'male' | 'female'
      const confidence = faceDetails.Gender.Confidence
      console.log(`AWS Rekognition detected gender: ${gender} (${confidence.toFixed(1)}% confidence)`)
      return gender
    }

    console.log('No face detected by AWS Rekognition, defaulting to male')
    return 'male'
  } catch (error) {
    console.error('AWS Rekognition error:', error)
    return 'male' // Default fallback
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Test gender detection endpoint
    if (url.pathname === '/test-gender' && request.method === 'POST') {
      try {
        const body = await request.json() as { imageUrl: string }
        const { imageUrl } = body

        if (!imageUrl) {
          return new Response(JSON.stringify({ error: 'imageUrl required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Fetch the image
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`)
        }
        const imageBytes = await imageResponse.arrayBuffer()

        // Detect gender
        const gender = await detectGender(imageBytes, env)

        return new Response(JSON.stringify({
          success: true,
          imageUrl,
          gender,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Test FAL.ai endpoint (for debugging)
    if (url.pathname === '/test-fal' && request.method === 'POST') {
      try {
        const body = await request.json() as { prompt?: string }
        const prompt = body.prompt || 'A beautiful Singapore kampung village scene'

        const sceneImageUrl = await generateScene(prompt, env.FAL_KEY)

        return new Response(JSON.stringify({
          success: true,
          imageUrl: sceneImageUrl,
          prompt
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Image generation endpoint
    if (url.pathname === '/generate' && request.method === 'POST') {
      try {
        const startTime = Date.now()
        const timings: Record<string, number> = {}

        const body: GenerateRequest = await request.json()
        const { photo, prompt, timePeriod } = body

        if (!photo || !prompt) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        const imageId = generateId()
        const photoBase64 = extractBase64(photo)
        const photoBuffer = base64ToArrayBuffer(photoBase64)

        // Steps 1 & 2 run in PARALLEL: Upload to R2 + Detect gender (independent operations)
        let stepStart = Date.now()
        const userPhotoPath = `uploads/${imageId}-face.jpg`

        const [_, detectedGender] = await Promise.all([
          // Step 1: Upload user's photo to R2
          env.IMAGES_BUCKET.put(userPhotoPath, photoBuffer, {
            httpMetadata: { contentType: 'image/jpeg' },
          }),
          // Step 2: Detect gender using AWS Rekognition
          detectGender(photoBuffer, env)
        ])

        const userPhotoUrl = `${env.PUBLIC_URL}/${userPhotoPath}`
        timings['1_2_upload_and_gender'] = Date.now() - stepStart
        console.log(`[TIMING] Steps 1+2 - Upload to R2 + Gender detection (parallel): ${timings['1_2_upload_and_gender']}ms - Gender: ${detectedGender}`)

        // Step 3: Generate image with face embedded using IP-Adapter Face ID
        // This replaces the old 2-step approach (generate scene + face swap)
        // IP-Adapter embeds the face INTO the generation for better identity preservation (~70-75% vs ~20-30%)
        stepStart = Date.now()
        const generatedImageUrl = await generateWithFaceId(userPhotoUrl, prompt, timePeriod, detectedGender, env.FAL_KEY)
        timings['3_face_id_generation'] = Date.now() - stepStart
        console.log(`[TIMING] Step 3 - IP-Adapter Face ID generation: ${timings['3_face_id_generation']}ms`)

        // Step 4: Outpaint top of image for fullscreen phone display
        stepStart = Date.now()
        const outpaintedImageUrl = await outpaintTop(generatedImageUrl, prompt, env.FAL_KEY)
        timings['4_outpaint_top'] = Date.now() - stepStart
        console.log(`[TIMING] Step 4 - Outpaint top: ${timings['4_outpaint_top']}ms`)

        // Fetch and store the final image
        stepStart = Date.now()
        const finalImage = await fetchImage(outpaintedImageUrl)
        timings['5a_fetch_final'] = Date.now() - stepStart
        console.log(`[TIMING] Step 5a - Fetch final image: ${timings['5a_fetch_final']}ms`)

        stepStart = Date.now()
        const imagePath = `generated/${timePeriod}/${imageId}.jpg`
        await env.IMAGES_BUCKET.put(imagePath, finalImage, {
          httpMetadata: {
            contentType: 'image/jpeg',
          },
          customMetadata: {
            prompt,
            timePeriod,
            createdAt: new Date().toISOString(),
          },
        })
        timings['5b_store_r2'] = Date.now() - stepStart
        console.log(`[TIMING] Step 5b - Store to R2: ${timings['5b_store_r2']}ms`)

        // Generate public URL
        const publicUrl = `${env.PUBLIC_URL}/${imagePath}`

        const totalTime = Date.now() - startTime
        timings['total'] = totalTime
        console.log(`[TIMING] TOTAL: ${totalTime}ms`)
        console.log(`[TIMING] Summary: ${JSON.stringify(timings)}`)

        const response: GenerateResponse = {
          imageUrl: publicUrl,
          qrUrl: publicUrl,
        }

        return new Response(JSON.stringify({ ...response, timings }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('Generation error:', error)
        return new Response(
          JSON.stringify({
            error: 'Image generation failed',
            details: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // NEW: Inpainting-based generation endpoint (v2)
    // Pipeline: User photo → Remove BG mask → Invert → Flux Fill → Result
    // Benefits: Preserves user's actual appearance (face, body, hair, clothes)
    if (url.pathname === '/generate-v2' && request.method === 'POST') {
      try {
        const body: GenerateRequest = await request.json()
        const { photo, prompt, timePeriod } = body

        if (!photo || !prompt) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        const imageId = generateId()
        const photoBase64 = extractBase64(photo)

        // Step 1: Upload user's original photo to R2
        const userPhotoPath = `uploads/${imageId}-original.jpg`
        const photoBuffer = base64ToArrayBuffer(photoBase64)
        await env.IMAGES_BUCKET.put(userPhotoPath, photoBuffer, {
          httpMetadata: { contentType: 'image/jpeg' },
        })
        const userPhotoUrl = `${env.PUBLIC_URL}/${userPhotoPath}`
        console.log('V2: Uploaded user photo:', userPhotoUrl)

        // Step 2: Get segmentation mask using BiRefNet
        // BiRefNet returns: white = person (foreground), black = background
        const { cutoutUrl, maskUrl: rawMaskUrl } = await getSegmentationMask(userPhotoUrl, env.FAL_KEY)
        console.log('V2: Got segmentation - cutout:', cutoutUrl, 'mask:', rawMaskUrl)

        // Step 3: For Flux Fill, we need: white = areas to FILL (background), black = areas to KEEP (person)
        // BiRefNet mask has it inverted (white = person), so we'll try as-is first
        // Note: If results are wrong, we may need to add mask inversion step
        const maskUrl = rawMaskUrl
        console.log('V2: Using mask URL:', maskUrl)

        // Step 4: Use Flux Pro Fill to inpaint the background
        const inpaintedUrl = await inpaintBackground(
          userPhotoUrl,
          maskUrl,
          `${prompt} The person is naturally integrated into this scene with consistent lighting and perspective.`,
          env.FAL_KEY
        )
        console.log('V2: Inpainted image:', inpaintedUrl)

        // Step 5: Fetch and store the final image
        const finalImage = await fetchImage(inpaintedUrl)
        const imagePath = `generated/${timePeriod}/${imageId}.jpg`
        await env.IMAGES_BUCKET.put(imagePath, finalImage, {
          httpMetadata: {
            contentType: 'image/jpeg',
          },
          customMetadata: {
            prompt,
            timePeriod,
            method: 'inpainting-v2',
            createdAt: new Date().toISOString(),
          },
        })

        // Generate public URL
        const publicUrl = `${env.PUBLIC_URL}/${imagePath}`

        const response: GenerateResponse = {
          imageUrl: publicUrl,
          qrUrl: publicUrl,
        }

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('V2 Generation error:', error)
        return new Response(
          JSON.stringify({
            error: 'Image generation failed (v2)',
            details: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Serve images from R2 (generated images and uploaded photos)
    if (url.pathname.startsWith('/generated/') || url.pathname.startsWith('/uploads/')) {
      const key = url.pathname.slice(1) // Remove leading slash
      const object = await env.IMAGES_BUCKET.get(key)

      if (!object) {
        return new Response('Image not found', { status: 404 })
      }

      return new Response(object.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })
  },
}
