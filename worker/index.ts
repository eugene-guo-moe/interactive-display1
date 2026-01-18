/**
 * Cloudflare Worker for Singapore History vs Future Image Generation
 *
 * Pipeline:
 * 1. Receive photo + prompt from frontend
 * 2. Upload photo to R2 + Detect gender using AWS Rekognition (parallel)
 * 3. Generate scene with person's face using PuLID FLUX (91% face accuracy)
 * 4. Store in R2 and return URL
 *
 * Security Features:
 * - API key authentication
 * - Rate limiting
 * - Input size validation
 * - Path traversal protection
 * - SSRF protection
 * - Restricted CORS
 */

import { AwsClient } from 'aws4fetch'

export interface Env {
  FAL_KEY: string
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
  AWS_REGION: string
  IMAGES_BUCKET: R2Bucket
  PUBLIC_URL: string // e.g., "https://images.yoursite.com"
  API_KEY?: string // Optional API key for authentication
  ALLOWED_ORIGINS?: string // Comma-separated list of allowed origins
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

// Security constants
const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB max for base64 string
const MAX_DECODED_SIZE = 10 * 1024 * 1024 // 10MB max decoded size
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5 // Max 5 requests per minute per IP

// Simple in-memory rate limiter (resets on worker restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Private IP ranges for SSRF protection
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

// Check if hostname is a private IP
function isPrivateIP(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some(pattern => pattern.test(hostname))
}

// Rate limiting check
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}

// Validate R2 path to prevent path traversal
function isValidR2Path(path: string): boolean {
  // Only allow alphanumeric, hyphens, underscores, dots, and forward slashes
  if (!/^[a-zA-Z0-9\-_./]+$/.test(path)) {
    return false
  }
  // Block path traversal attempts
  if (path.includes('..') || path.includes('./') || path.startsWith('/')) {
    return false
  }
  // Must start with allowed prefixes
  if (!path.startsWith('generated/') && !path.startsWith('uploads/')) {
    return false
  }
  return true
}

// Get allowed origins from env or default
function getAllowedOrigins(env: Env): string[] {
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  }
  // Default allowed origins - update these for your deployment
  return [
    'https://interactive-display.vercel.app',
    'https://riversidesec.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ]
}

// Get CORS headers with origin validation
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigins = getAllowedOrigins(env)

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => {
    if (allowed === origin) return true
    // Support wildcard subdomains
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      return origin.endsWith(domain) || origin.endsWith('.' + domain)
    }
    return false
  })

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
  }
}

// Verify API key authentication
function verifyApiKey(request: Request, env: Env): boolean {
  // If no API key is configured, skip authentication (for backwards compatibility)
  if (!env.API_KEY) {
    return true
  }
  const providedKey = request.headers.get('X-API-Key')
  return providedKey === env.API_KEY
}

// Extract base64 data from data URL if present
function extractBase64(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1]
  }
  return dataUrl
}

// Convert base64 to ArrayBuffer with size validation
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Validate base64 length before decoding
  // Base64 encodes 3 bytes as 4 characters, so decoded size is roughly 3/4 of base64 length
  const estimatedDecodedSize = Math.ceil(base64.length * 3 / 4)
  if (estimatedDecodedSize > MAX_DECODED_SIZE) {
    throw new Error(`Image too large: ${(estimatedDecodedSize / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_DECODED_SIZE / 1024 / 1024}MB limit`)
  }

  const binaryString = atob(base64)
  if (binaryString.length > MAX_DECODED_SIZE) {
    throw new Error(`Decoded image too large: ${(binaryString.length / 1024 / 1024).toFixed(1)}MB`)
  }

  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
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

// Security headers for all responses
function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const corsHeaders = getCorsHeaders(request, env)
    const securityHeaders = getSecurityHeaders()
    const allHeaders = { ...corsHeaders, ...securityHeaders }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: allHeaders })
    }

    // Health check endpoint (no auth required)
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...allHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                     'unknown'

    // Test gender detection endpoint (requires auth)
    if (url.pathname === '/test-gender' && request.method === 'POST') {
      // Verify API key
      if (!verifyApiKey(request, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Rate limiting
      const rateLimit = checkRateLimit(clientIP)
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: {
            ...allHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter),
          },
        })
      }

      try {
        const body = await request.json() as { imageUrl: string }
        const { imageUrl } = body

        if (!imageUrl) {
          return new Response(JSON.stringify({ error: 'imageUrl required' }), {
            status: 400,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
          })
        }

        // SSRF Protection: Validate URL
        let parsedUrl: URL
        try {
          parsedUrl = new URL(imageUrl)
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
            status: 400,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Only allow HTTPS
        if (parsedUrl.protocol !== 'https:') {
          return new Response(JSON.stringify({ error: 'Only HTTPS URLs allowed' }), {
            status: 400,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Block private IPs
        if (isPrivateIP(parsedUrl.hostname)) {
          return new Response(JSON.stringify({ error: 'Access denied' }), {
            status: 403,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('Gender detection error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: 'Gender detection failed'
        }), {
          status: 500,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Image generation endpoint
    if (url.pathname === '/generate' && request.method === 'POST') {
      // Verify API key
      if (!verifyApiKey(request, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Rate limiting
      const rateLimit = checkRateLimit(clientIP)
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: {
            ...allHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter),
          },
        })
      }

      try {
        const startTime = Date.now()
        const timings: Record<string, number> = {}

        // Check Content-Length before parsing
        const contentLength = request.headers.get('content-length')
        if (contentLength && parseInt(contentLength) > MAX_PHOTO_SIZE + 1024) {
          return new Response(JSON.stringify({ error: 'Request too large' }), {
            status: 413,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
          })
        }

        const body: GenerateRequest = await request.json()
        const { photo, prompt, timePeriod } = body

        // Validate required fields
        if (!photo || !prompt) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            {
              status: 400,
              headers: { ...allHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        // Validate photo size
        if (photo.length > MAX_PHOTO_SIZE) {
          return new Response(
            JSON.stringify({ error: 'Photo too large (max 5MB)' }),
            {
              status: 400,
              headers: { ...allHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        // Validate timePeriod
        if (!['past', 'present', 'future'].includes(timePeriod)) {
          return new Response(
            JSON.stringify({ error: 'Invalid time period' }),
            {
              status: 400,
              headers: { ...allHeaders, 'Content-Type': 'application/json' },
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

        // Step 4: Fetch and store the final image
        // PuLID already outputs 576x1024 (9:16) which is phone fullscreen - no outpaint needed
        stepStart = Date.now()
        const finalImage = await fetchImage(generatedImageUrl)
        timings['4_fetch_final'] = Date.now() - stepStart
        console.log(`[TIMING] Step 4 - Fetch final image: ${timings['4_fetch_final']}ms`)

        stepStart = Date.now()
        const imagePath = `generated/${timePeriod}/${imageId}.jpg`
        await env.IMAGES_BUCKET.put(imagePath, finalImage, {
          httpMetadata: {
            contentType: 'image/jpeg',
          },
          customMetadata: {
            timePeriod,
            createdAt: new Date().toISOString(),
            // Don't store prompt in metadata for privacy
          },
        })
        timings['5_store_r2'] = Date.now() - stepStart
        console.log(`[TIMING] Step 5 - Store to R2: ${timings['5_store_r2']}ms`)

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
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('Generation error:', error)
        return new Response(
          JSON.stringify({ error: 'Image generation failed' }),
          {
            status: 500,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Serve images from R2 (generated images and uploaded photos)
    if (url.pathname.startsWith('/generated/') || url.pathname.startsWith('/uploads/')) {
      const key = url.pathname.slice(1) // Remove leading slash

      // Path traversal protection
      if (!isValidR2Path(key)) {
        return new Response('Invalid path', {
          status: 400,
          headers: allHeaders
        })
      }

      const object = await env.IMAGES_BUCKET.get(key)

      if (!object) {
        return new Response('Image not found', { status: 404, headers: allHeaders })
      }

      // Different cache durations for different paths
      const isUpload = key.startsWith('uploads/')
      const cacheControl = isUpload
        ? 'private, max-age=300' // 5 minutes for uploads
        : 'public, max-age=86400' // 1 day for generated images

      return new Response(object.body, {
        headers: {
          ...allHeaders,
          'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': cacheControl,
        },
      })
    }

    return new Response('Not found', { status: 404, headers: allHeaders })
  },
}
