/**
 * Cloudflare Worker for Singapore History vs Future Image Generation
 *
 * Pipeline:
 * 1. Receive photo + prompt from frontend
 * 2. Remove background from user photo (remove.bg API)
 * 3. Generate scene background (FAL.ai Flux Schnell)
 * 4. Composite user onto scene
 * 5. Store in R2 and return URL
 */

export interface Env {
  REMOVE_BG_KEY: string
  FAL_KEY: string
  IMAGES_BUCKET: R2Bucket
  PUBLIC_URL: string // e.g., "https://images.yoursite.com"
}

interface GenerateRequest {
  photo: string // base64 image data (with or without prefix)
  prompt: string
  timePeriod: 'past' | 'future'
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

// Remove background using remove.bg API
async function removeBackground(
  imageBase64: string,
  apiKey: string
): Promise<ArrayBuffer> {
  const formData = new FormData()
  formData.append('image_file_b64', imageBase64)
  formData.append('size', 'auto')
  formData.append('format', 'png')

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`remove.bg error: ${error}`)
  }

  return response.arrayBuffer()
}

// Generate scene with a person using FAL.ai Flux
async function generateSceneWithPerson(
  prompt: string,
  timePeriod: 'past' | 'future',
  gender: 'male' | 'female',
  apiKey: string
): Promise<string> {
  // Use gender-specific terms for better AI generation
  const personTerm = gender === 'female'
    ? 'A woman'
    : 'A man'

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${prompt} with ${personTerm.toLowerCase()} in the foreground looking directly at the viewer, front-facing portrait from waist up, face clearly visible, making eye contact with camera, seamlessly blended into the environment, consistent lighting, neutral pleasant expression, flattering portrait lighting, photorealistic.`,
      image_size: 'portrait_4_3',
      num_images: 1,
      safety_tolerance: 2,
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

// Swap face using FAL.ai face-swap
async function swapFace(
  targetImageUrl: string,
  faceImageUrl: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/face-swap', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_image_url: targetImageUrl,
      swap_image_url: faceImageUrl,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FAL.ai face-swap error: ${error}`)
  }

  const result = await response.json() as {
    image: { url: string }
  }

  if (!result.image || !result.image.url) {
    throw new Error('No face-swapped image generated')
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

// Fetch image from URL
async function fetchImage(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`)
  }
  return response.arrayBuffer()
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

// Detect gender from face image using FAL.ai face analysis
async function detectGender(
  imageUrl: string,
  apiKey: string
): Promise<'male' | 'female'> {
  try {
    const response = await fetch('https://fal.run/fal-ai/florence-2-large/more-detailed-caption', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        task_prompt: 'Describe the person in this image. Is this a man/male or woman/female?',
      }),
    })

    if (!response.ok) {
      console.error('Gender detection failed, defaulting to neutral')
      return 'male' // Default fallback
    }

    const result = await response.json() as {
      results: string
    }

    const caption = (result.results || '').toLowerCase()

    // Check for female indicators
    if (caption.includes('woman') || caption.includes('female') ||
        caption.includes('girl') || caption.includes('lady') ||
        caption.includes('she') || caption.includes('her ')) {
      return 'female'
    }

    // Default to male if not clearly female
    return 'male'
  } catch (error) {
    console.error('Gender detection error:', error)
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

        // Step 1: Upload user's photo to R2 to get a public URL (required by Easel AI)
        const userPhotoPath = `uploads/${imageId}-face.jpg`
        const photoBuffer = base64ToArrayBuffer(photoBase64)
        await env.IMAGES_BUCKET.put(userPhotoPath, photoBuffer, {
          httpMetadata: { contentType: 'image/jpeg' },
        })
        const userPhotoUrl = `${env.PUBLIC_URL}/${userPhotoPath}`

        // Step 2: Detect gender from the user's photo
        const detectedGender = await detectGender(userPhotoUrl, env.FAL_KEY)
        console.log(`Detected gender: ${detectedGender}`)

        // Step 3: Generate scene with a person matching the detected gender
        const sceneWithPersonUrl = await generateSceneWithPerson(prompt, timePeriod, detectedGender, env.FAL_KEY)

        // Step 4: Swap the face with user's actual face
        const generatedImageUrl = await swapFace(sceneWithPersonUrl, userPhotoUrl, env.FAL_KEY)

        // Fetch and store the final image
        const finalImage = await fetchImage(generatedImageUrl)
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
