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

// Generate image with face using PuLID FLUX for better identity preservation (~91% accuracy)
// PuLID provides superior face preservation compared to IP-Adapter Face ID (~70-75%)
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

  const fullPrompt = `${prompt} featuring ${personTerm} wearing complete, modest, school-appropriate clothing with fully covered torso, portrait from waist up, face clearly visible, looking at camera, photorealistic, high quality, consistent lighting, family-friendly, appropriate for all ages`

  console.log('[PULID] Generating with prompt:', fullPrompt.substring(0, 100) + '...')
  console.log('[PULID] Reference image:', faceImageUrl)

  const response = await fetch('https://fal.run/fal-ai/flux-pulid', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      reference_image_url: faceImageUrl,
      negative_prompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs, disfigured, bare chest, shirtless, open vest, exposed skin, revealing clothing, low cut, cleavage, sleeveless, tank top, bikini, swimwear, underwear, lingerie, nudity, nsfw, inappropriate, suggestive',
      num_inference_steps: 20,
      guidance_scale: 4,
      id_weight: 1.0, // Maximum identity preservation
      image_size: {
        width: 576,   // 9:16 aspect ratio for phones
        height: 1024,
      },
      enable_safety_checker: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[PULID] API error:', error)
    throw new Error(`FAL.ai PuLID FLUX error: ${error}`)
  }

  const result = await response.json() as {
    image?: { url: string; file_size?: number }
    images?: Array<{ url: string; file_size?: number }>
  }

  console.log('[PULID] Raw response keys:', Object.keys(result))

  // Handle both response formats (image or images array)
  const outputUrl = result.image?.url || result.images?.[0]?.url

  if (!outputUrl) {
    console.log('[PULID] No URL found in response:', JSON.stringify(result))
    throw new Error('No image generated with PuLID')
  }

  const fileSize = result.image?.file_size || result.images?.[0]?.file_size
  if (fileSize) {
    console.log(`[PULID] Output file size: ${(fileSize / 1024).toFixed(1)} KB`)
  }

  console.log('[PULID] Generated image:', outputUrl)
  return outputUrl
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

        // Step 3: Generate image with face embedded using PuLID FLUX
        // PuLID achieves ~91% face recognition accuracy vs IP-Adapter's ~70-75%
        stepStart = Date.now()
        const generatedImageUrl = await generateWithFaceId(userPhotoUrl, prompt, timePeriod, detectedGender, env.FAL_KEY)
        timings['3_pulid_generation'] = Date.now() - stepStart
        console.log(`[TIMING] Step 3 - PuLID FLUX generation: ${timings['3_pulid_generation']}ms`)

        // Step 4: Skip outpaint for now - it was distorting the face
        // TODO: Find a better outpainting solution that preserves the face
        // const outpaintedImageUrl = await outpaintTop(generatedImageUrl, prompt, env.FAL_KEY)
        const outpaintedImageUrl = generatedImageUrl
        console.log(`[TIMING] Step 4 - Outpaint skipped (using PuLID output directly)`)

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
