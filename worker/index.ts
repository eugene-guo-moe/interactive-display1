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

// Valid profile types for image generation
type ProfileType = 'guardian' | 'builder' | 'shaper' | 'guardian-builder' | 'builder-shaper' | 'adaptive-guardian'
// Legacy time periods (for backwards compatibility)
type TimePeriod = 'past' | 'present' | 'future'
// Combined type for the API
type GenerationCategory = ProfileType | TimePeriod

interface GenerateRequest {
  photo: string // base64 image data (with or without prefix)
  prompt: string
  timePeriod: GenerationCategory // Accepts both profile types and legacy time periods
}

interface GenerateResponse {
  imageUrl: string  // FAL.ai URL for immediate display
  r2Path: string    // Path for R2 upload (frontend will call /upload-to-r2)
  timePeriod: string
}

interface UploadToR2Request {
  falUrl: string
  r2Path: string
  timePeriod: string
}

interface UploadToR2Response {
  r2Url: string
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

// Validate R2 path to prevent path traversal - strict pattern matching
function isValidR2Path(path: string): boolean {
  // Strict pattern: generated/{category}/{timestamp}-{random}.jpg
  // Categories: legacy (past|present|future) or profiles (guardian|builder|shaper|guardian-builder|builder-shaper|adaptive-guardian)
  const generatedPattern = /^generated\/(past|present|future|guardian|builder|shaper|guardian-builder|builder-shaper|adaptive-guardian)\/\d+-[a-z0-9]{7}\.jpg$/
  // Strict pattern: uploads/{timestamp}-face.jpg
  const uploadsPattern = /^uploads\/\d+-[a-z0-9]{7}-face\.jpg$/
  // Strict pattern: cards/{profile}/{timestamp}-{random}.png
  const cardsPattern = /^cards\/(guardian|builder|shaper|guardian-builder|builder-shaper|adaptive-guardian)\/\d+-[a-z0-9]{9}\.png$/

  return generatedPattern.test(path) || uploadsPattern.test(path) || cardsPattern.test(path)
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

// Get CORS headers with strict origin validation (no wildcards)
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigins = getAllowedOrigins(env)

  // Strict exact match only - no wildcard patterns allowed
  const isAllowed = allowedOrigins.includes(origin)

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

// Validate base64 string format
function isValidBase64(str: string): boolean {
  // Check for valid base64 characters and proper padding
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(str)) {
    return false
  }
  // Length must be divisible by 4
  if (str.length % 4 !== 0) {
    return false
  }
  return true
}

// Validate JPEG magic number (first 2 bytes should be FF D8)
function isValidJpeg(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer)
  // Check JPEG magic number: 0xFF 0xD8
  return bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8
}

// Extract base64 data from data URL if present
function extractBase64(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    // Validate MIME type for images
    const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
    if (!match) {
      throw new Error('Invalid image data URL format')
    }
    return match[2]
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
// Uses FAL.ai Queue API for better reliability on slow generations
async function generateWithFaceId(
  faceImageUrl: string,
  prompt: string,
  _category: GenerationCategory, // Unused but kept for API consistency
  faceAttributes: FaceAttributes,
  apiKey: string
): Promise<string> {
  // Use gender-specific terms with appropriate descriptions
  const personTerm = faceAttributes.gender === 'female'
    ? 'a woman'
    : 'a man'

  // Add glasses to prompt if detected
  const glassesDescription = faceAttributes.hasGlasses
    ? ' wearing glasses'
    : ''

  const fullPrompt = `${prompt} featuring ${personTerm}${glassesDescription} wearing complete, modest, school-appropriate clothing with fully covered torso, portrait from waist up, face clearly visible, looking at camera, photorealistic, high quality, consistent lighting, family-friendly, appropriate for all ages`

  const requestBody = {
    prompt: fullPrompt,
    reference_image_url: faceImageUrl,
    negative_prompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs, disfigured, bare chest, shirtless, open vest, exposed skin, revealing clothing, low cut, cleavage, sleeveless, tank top, bikini, swimwear, underwear, lingerie, nudity, nsfw, inappropriate, suggestive',
    num_inference_steps: 20,
    guidance_scale: 4,
    id_weight: 1.0,
    image_size: {
      width: 576,
      height: 1024,
    },
    enable_safety_checker: true,
  }

  // Step 1: Submit to queue
  const submitResponse = await fetch('https://queue.fal.run/fal-ai/flux-pulid', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!submitResponse.ok) {
    const error = await submitResponse.text()
    throw new Error(`FAL.ai queue submit error: ${error}`)
  }

  const { request_id } = await submitResponse.json() as { request_id: string }

  if (!request_id) {
    throw new Error('No request_id returned from FAL.ai queue')
  }

  // Step 2: Poll for completion (max 75 seconds with 1s intervals)
  const maxPolls = 75
  const pollInterval = 1000

  for (let i = 0; i < maxPolls; i++) {
    // Wait before polling (skip first iteration for faster initial check)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/flux-pulid/requests/${request_id}/status`,
      {
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      }
    )

    if (!statusResponse.ok) {
      continue // Retry on status check failure
    }

    const status = await statusResponse.json() as { status: string }

    if (status.status === 'COMPLETED') {
      // Step 3: Fetch the result
      const resultResponse = await fetch(
        `https://queue.fal.run/fal-ai/flux-pulid/requests/${request_id}`,
        {
          headers: {
            'Authorization': `Key ${apiKey}`,
          },
        }
      )

      if (!resultResponse.ok) {
        const error = await resultResponse.text()
        throw new Error(`FAL.ai result fetch error: ${error}`)
      }

      const result = await resultResponse.json() as {
        image?: { url: string }
        images?: Array<{ url: string }>
      }

      const outputUrl = result.image?.url || result.images?.[0]?.url

      if (!outputUrl) {
        throw new Error('No image in FAL.ai result')
      }

      return outputUrl
    }

    if (status.status === 'FAILED') {
      throw new Error('FAL.ai generation failed')
    }

    // IN_QUEUE or IN_PROGRESS - continue polling
  }

  throw new Error('FAL.ai generation timed out')
}

// Fetch image from URL with size validation
const MAX_FETCH_SIZE = 20 * 1024 * 1024 // 20MB max for fetched images

async function fetchImage(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`)
    }

    // Validate Content-Length before downloading
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_FETCH_SIZE) {
      throw new Error(`Image too large: ${(parseInt(contentLength) / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FETCH_SIZE / 1024 / 1024}MB limit`)
    }

    const buffer = await response.arrayBuffer()

    // Double-check actual size after download
    if (buffer.byteLength > MAX_FETCH_SIZE) {
      throw new Error(`Downloaded image too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB`)
    }

    return buffer
  } finally {
    clearTimeout(timeoutId)
  }
}

// Generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Face attributes detected by AWS Rekognition
interface FaceAttributes {
  gender: 'male' | 'female'
  hasGlasses: boolean
}

// Detect face attributes (gender, glasses) from face image using AWS Rekognition
async function detectFaceAttributes(
  imageBytes: ArrayBuffer,
  env: Env
): Promise<FaceAttributes> {
  const defaultAttributes: FaceAttributes = { gender: 'male', hasGlasses: false }

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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout for face detection

    try {
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
          Attributes: ['GENDER', 'EYEGLASSES'],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        return defaultAttributes
      }

    const result = await response.json() as {
      FaceDetails?: Array<{
        Gender?: {
          Value: 'Male' | 'Female'
          Confidence: number
        }
        Eyeglasses?: {
          Value: boolean
          Confidence: number
        }
      }>
    }

      // Get the first face's attributes
      const faceDetails = result.FaceDetails?.[0]
      if (faceDetails) {
        const gender = faceDetails.Gender?.Value?.toLowerCase() as 'male' | 'female' || 'male'
        const hasGlasses = faceDetails.Eyeglasses?.Value || false
        return { gender, hasGlasses }
      }

      return defaultAttributes
    } finally {
      clearTimeout(timeoutId)
    }
  } catch {
    return defaultAttributes
  }
}

// Security headers for all responses
function getSecurityHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    // Get client IP for rate limiting - only trust Cloudflare's header
    // CF-Connecting-IP is set by Cloudflare and cannot be spoofed by clients
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown'

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

        // Detect face attributes
        const faceAttributes = await detectFaceAttributes(imageBytes, env)

        return new Response(JSON.stringify({
          success: true,
          imageUrl,
          gender: faceAttributes.gender,
          hasGlasses: faceAttributes.hasGlasses,
        }), {
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'Gender detection failed'
        }), {
          status: 500,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Test R2 upload endpoint (for debugging - no auth required)
    if (url.pathname === '/test-r2' && request.method === 'POST') {
      const testId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const testPath = `generated/present/${testId}.jpg`
      const testData = new TextEncoder().encode('test image data')

      try {
        await env.IMAGES_BUCKET.put(testPath, testData, {
          httpMetadata: { contentType: 'image/jpeg' },
        })

        // Verify it was written
        const obj = await env.IMAGES_BUCKET.get(testPath)
        const exists = obj !== null

        return new Response(JSON.stringify({
          success: true,
          testPath,
          publicUrl: `${env.PUBLIC_URL}/${testPath}`,
          verified: exists,
        }), {
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }), {
          status: 500,
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Test fetch and R2 upload (replicates background flow)
    if (url.pathname === '/test-fetch-r2' && request.method === 'POST') {
      try {
        const body = await request.json() as { imageUrl?: string }
        if (!body.imageUrl) {
          return new Response(JSON.stringify({ error: 'imageUrl required' }), {
            status: 400,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
          })
        }

        const testId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        const testPath = `generated/present/${testId}.jpg`

        // Fetch image
        const fetchStart = Date.now()
        const imageData = await fetchImage(body.imageUrl)
        const fetchTime = Date.now() - fetchStart

        // Upload to R2
        const uploadStart = Date.now()
        await env.IMAGES_BUCKET.put(testPath, imageData, {
          httpMetadata: { contentType: 'image/jpeg' },
        })
        const uploadTime = Date.now() - uploadStart

        // Verify
        const obj = await env.IMAGES_BUCKET.get(testPath)

        return new Response(JSON.stringify({
          success: true,
          testPath,
          publicUrl: `${env.PUBLIC_URL}/${testPath}`,
          fetchTime,
          uploadTime,
          imageSize: imageData.byteLength,
          verified: obj !== null,
        }), {
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
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

        // Validate timePeriod (accepts both legacy time periods and new profile types)
        const validCategories = ['past', 'present', 'future', 'guardian', 'builder', 'shaper', 'guardian-builder', 'builder-shaper', 'adaptive-guardian']
        if (!validCategories.includes(timePeriod)) {
          return new Response(
            JSON.stringify({ error: 'Invalid category' }),
            {
              status: 400,
              headers: { ...allHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        const imageId = generateId()
        const photoBase64 = extractBase64(photo)

        // Validate base64 format
        if (!isValidBase64(photoBase64)) {
          return new Response(
            JSON.stringify({ error: 'Invalid image format' }),
            {
              status: 400,
              headers: { ...allHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        const photoBuffer = base64ToArrayBuffer(photoBase64)

        // Validate JPEG magic number
        if (!isValidJpeg(photoBuffer)) {
          return new Response(
            JSON.stringify({ error: 'Invalid image: must be JPEG format' }),
            {
              status: 400,
              headers: { ...allHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        // Steps 1 & 2 run in PARALLEL: Upload to R2 + Detect face attributes (independent operations)
        const userPhotoPath = `uploads/${imageId}-face.jpg`

        const [_, faceAttributes] = await Promise.all([
          // Step 1: Upload user's photo to R2
          env.IMAGES_BUCKET.put(userPhotoPath, photoBuffer, {
            httpMetadata: { contentType: 'image/jpeg' },
          }),
          // Step 2: Detect face attributes (gender, glasses) using AWS Rekognition
          detectFaceAttributes(photoBuffer, env)
        ])

        const userPhotoUrl = `${env.PUBLIC_URL}/${userPhotoPath}`
        timings['upload_and_detect'] = Date.now() - startTime
        console.log(`[${imageId}] Upload + detect: ${timings['upload_and_detect']}ms`)

        // Step 3: Generate image with face embedded using PuLID FLUX
        // PuLID achieves ~91% face recognition accuracy vs IP-Adapter's ~70-75%
        const falStartTime = Date.now()
        const generatedImageUrl = await generateWithFaceId(userPhotoUrl, prompt, timePeriod, faceAttributes, env.FAL_KEY)
        timings['fal_generation'] = Date.now() - falStartTime
        console.log(`[${imageId}] FAL.ai generation: ${timings['fal_generation']}ms`)
        console.log(`[${imageId}] FAL.ai URL: ${generatedImageUrl}`)

        // Generate R2 path for later upload by frontend
        const imagePath = `generated/${timePeriod}/${imageId}.jpg`

        // Return FAL.ai URL immediately for fast display
        // Frontend will call /upload-to-r2 to get permanent R2 URL
        const response: GenerateResponse = {
          imageUrl: generatedImageUrl,  // FAL.ai URL - fast CDN
          r2Path: imagePath,            // Path for R2 upload
          timePeriod,
        }

        console.log(`[${imageId}] Total response time: ${Date.now() - startTime}ms`)

        return new Response(JSON.stringify(response), {
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch {
        return new Response(
          JSON.stringify({ error: 'Image generation failed' }),
          {
            status: 500,
            headers: { ...allHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Upload FAL.ai image to R2 for permanent storage
    // Called by frontend after displaying FAL.ai image
    if (url.pathname === '/upload-to-r2' && request.method === 'POST') {
      try {
        const body = await request.json() as UploadToR2Request
        const { falUrl, r2Path, timePeriod } = body

        // Validate required fields
        if (!falUrl || !r2Path || !timePeriod) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: falUrl, r2Path, timePeriod' }),
            { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate r2Path format for security
        if (!isValidR2Path(r2Path)) {
          return new Response(
            JSON.stringify({ error: 'Invalid r2Path format' }),
            { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate FAL.ai URL
        if (!falUrl.includes('fal.media') && !falUrl.includes('fal.ai')) {
          return new Response(
            JSON.stringify({ error: 'Invalid FAL URL' }),
            { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[upload-to-r2] Fetching from FAL: ${falUrl}`)
        const fetchStart = Date.now()

        // Fetch image from FAL.ai CDN
        const finalImage = await fetchImage(falUrl)
        console.log(`[upload-to-r2] FAL fetch: ${Date.now() - fetchStart}ms`)

        // Upload to R2
        const uploadStart = Date.now()
        await env.IMAGES_BUCKET.put(r2Path, finalImage, {
          httpMetadata: { contentType: 'image/jpeg' },
          customMetadata: {
            timePeriod,
            createdAt: new Date().toISOString(),
          },
        })
        console.log(`[upload-to-r2] R2 upload: ${Date.now() - uploadStart}ms`)

        const r2Url = `${env.PUBLIC_URL}/${r2Path}`
        console.log(`[upload-to-r2] Complete. R2 URL: ${r2Url}`)

        const response: UploadToR2Response = { r2Url }
        return new Response(JSON.stringify(response), {
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('[upload-to-r2] Error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to upload to R2' }),
          { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Upload card image (PNG with profile info) to R2
    // Called by frontend after generating the shareable card
    if (url.pathname === '/upload-card' && request.method === 'POST') {
      try {
        const body = await request.json() as { cardData: string; cardPath: string; profileType: string }
        const { cardData, cardPath, profileType } = body

        // Validate required fields
        if (!cardData || !cardPath || !profileType) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: cardData, cardPath, profileType' }),
            { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate cardPath format for security
        if (!isValidR2Path(cardPath)) {
          return new Response(
            JSON.stringify({ error: 'Invalid cardPath format' }),
            { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate base64 format
        if (!isValidBase64(cardData)) {
          return new Response(
            JSON.stringify({ error: 'Invalid card data format' }),
            { status: 400, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[upload-card] Uploading card for profile: ${profileType}`)
        const uploadStart = Date.now()

        // Decode base64 to buffer
        const cardBuffer = base64ToArrayBuffer(cardData)

        // Upload to R2
        await env.IMAGES_BUCKET.put(cardPath, cardBuffer, {
          httpMetadata: { contentType: 'image/png' },
          customMetadata: {
            profileType,
            createdAt: new Date().toISOString(),
          },
        })
        console.log(`[upload-card] R2 upload: ${Date.now() - uploadStart}ms`)

        const cardUrl = `${env.PUBLIC_URL}/${cardPath}`
        console.log(`[upload-card] Complete. Card URL: ${cardUrl}`)

        return new Response(JSON.stringify({ cardUrl }), {
          headers: { ...allHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error) {
        console.error('[upload-card] Error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to upload card' }),
          { status: 500, headers: { ...allHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Serve card landing page for mobile save (QR code points here)
    if (url.pathname.startsWith('/view/cards/')) {
      const imagePath = url.pathname.slice('/view/'.length) // e.g. "cards/builder/123.png"

      // Validate path
      if (!isValidR2Path(imagePath)) {
        return new Response('Invalid path', { status: 400, headers: allHeaders })
      }

      // Verify image exists
      const object = await env.IMAGES_BUCKET.head(imagePath)
      if (!object) {
        return new Response('Image not found', { status: 404, headers: allHeaders })
      }

      const imageUrl = `${env.PUBLIC_URL}/${imagePath}`

      // Extract profile type from path for accent color
      const profileMatch = imagePath.match(/^cards\/([\w-]+)\//)
      const profileType = profileMatch?.[1] || 'builder'
      const profileColors: Record<string, string> = {
        guardian: '#F59E0B',
        builder: '#10B981',
        shaper: '#6366F1',
        'guardian-builder': '#F59E0B',
        'builder-shaper': '#14B8A6',
        'adaptive-guardian': '#8B5CF6',
      }
      const accentColor = profileColors[profileType] || '#10B981'
      // Amber/gold needs dark text for contrast; the rest use white
      const btnTextColor = (profileType === 'guardian' || profileType === 'guardian-builder') ? '#1a1a1a' : '#ffffff'
      const btnSpinnerBorder = (profileType === 'guardian' || profileType === 'guardian-builder') ? '#1a1a1a30' : '#ffffff50'
      const btnSpinnerTop = btnTextColor

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Your Singapore Profile Card</title>
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:title" content="My Singapore Profile Card">
  <meta property="og:description" content="Discover your Singapore profile at Riverside Secondary School">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0a0a0a;
      color: white;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      padding-bottom: max(20px, env(safe-area-inset-bottom));
      overflow: hidden;
    }
    .glow {
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: ${accentColor};
      opacity: 0.12;
      filter: blur(80px);
      pointer-events: none;
    }
    .content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      opacity: 0;
      transform: translateY(20px);
      animation: fadeUp 0.5s ease-out 0.15s forwards;
    }
    @keyframes fadeUp {
      to { opacity: 1; transform: translateY(0); }
    }
    .card-image {
      width: 100%;
      max-width: 340px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${accentColor}20;
      margin-bottom: 28px;
    }
    .save-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      max-width: 300px;
      padding: 15px 28px;
      border-radius: 99px;
      border: none;
      background: ${accentColor};
      color: ${btnTextColor};
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 4px 24px ${accentColor}40;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .save-btn:active {
      transform: scale(0.96);
      box-shadow: 0 2px 12px ${accentColor}30;
    }
    .save-btn:disabled { opacity: 0.7; }
    .save-btn svg { width: 20px; height: 20px; }
    .hint {
      margin-top: 12px;
      font-size: 12px;
      color: rgba(255,255,255,0.3);
      text-align: center;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .hint.visible { opacity: 1; }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2.5px solid ${btnSpinnerBorder};
      border-top-color: ${btnSpinnerTop};
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="glow"></div>
  <div class="content">
    <img class="card-image" src="${imageUrl}" alt="Your Singapore Profile Card">
    <button class="save-btn" id="saveBtn" onclick="saveImage()">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      Save to Gallery
    </button>
    <p class="hint" id="hint"></p>
  </div>

  <script>
    const imageUrl = "${imageUrl}";

    async function saveImage() {
      const btn = document.getElementById('saveBtn');
      const hint = document.getElementById('hint');
      btn.innerHTML = '<div class="spinner"></div> Saving...';
      btn.disabled = true;

      try {
        // Fetch the image as a blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'singapore-profile.png', { type: 'image/png' });

        // Try Web Share API with file (best for mobile - goes straight to gallery)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Singapore Profile Card',
          });
          btn.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Saved!';
          hint.classList.remove('visible');
          return;
        }

        // Fallback: download via anchor tag
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'singapore-profile.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        btn.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Downloaded!';
        hint.textContent = 'Check your Downloads folder';
        hint.classList.add('visible');
      } catch (err) {
        if (err.name === 'AbortError') {
          // User cancelled the share sheet
          btn.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Save to Gallery';
          btn.disabled = false;
          hint.classList.remove('visible');
          return;
        }
        // Long-press fallback
        btn.innerHTML = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Save to Gallery';
        btn.disabled = false;
        hint.textContent = 'Long-press the image above to save';
        hint.classList.add('visible');
      }
    }
  </script>
</body>
</html>`;

      return new Response(html, {
        headers: {
          ...securityHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // Serve images from R2 (generated images, cards, and uploaded photos)
    if (url.pathname.startsWith('/generated/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/cards/')) {
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
        ? 'private, no-store' // No caching for uploads (kiosk privacy)
        : 'public, max-age=86400' // 1 day for generated images and cards

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
