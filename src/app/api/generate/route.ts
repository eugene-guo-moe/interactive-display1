import { NextRequest, NextResponse } from 'next/server'
import type { QuizAnswers, ProfileType } from '@/types/quiz'

export const runtime = 'edge'

// Worker URL from environment variable
const WORKER_URL = process.env.WORKER_URL || 'https://riversidesec.eugene-ff3.workers.dev'
const WORKER_API_KEY = process.env.WORKER_API_KEY || ''

// Security constants
const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB max for base64 string
const VALID_ANSWERS = ['A', 'B', 'C'] as const

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5 // Max 5 requests per minute per IP

// In-memory rate limiter (note: in edge runtime, this may not persist across instances)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Check rate limit for an IP
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  // Clean up old entries periodically (simple garbage collection)
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }

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

// Get client IP from request headers
function getClientIP(request: NextRequest): string {
  // Vercel/Cloudflare set these headers
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown'
}

// Validate quiz answers against whitelist (all 6 questions must be A, B, or C)
function validateAnswers(answers: QuizAnswers): boolean {
  const allAnswers = [answers.q1, answers.q2, answers.q3, answers.q4, answers.q5, answers.q6]
  return allAnswers.every(answer =>
    answer !== null && VALID_ANSWERS.includes(answer as typeof VALID_ANSWERS[number])
  )
}

// Calculate profile from answers
function calculateProfile(answers: QuizAnswers): ProfileType {
  const allAnswers = [answers.q1, answers.q2, answers.q3, answers.q4, answers.q5, answers.q6]
  const futureAnswers = [answers.q4, answers.q5, answers.q6]

  const counts = { A: 0, B: 0, C: 0 }
  const futureCounts = { A: 0, B: 0, C: 0 }

  allAnswers.forEach(answer => {
    if (answer === 'A') counts.A++
    else if (answer === 'B') counts.B++
    else if (answer === 'C') counts.C++
  })

  futureAnswers.forEach(answer => {
    if (answer === 'A') futureCounts.A++
    else if (answer === 'B') futureCounts.B++
    else if (answer === 'C') futureCounts.C++
  })

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [first, second, third] = sorted

  if (first[1] > second[1]) {
    if (first[0] === 'A') return 'guardian'
    if (first[0] === 'B') return 'builder'
    return 'shaper'
  }

  if (first[1] === second[1] && first[1] > third[1]) {
    const tiedLetters = [first[0], second[0]].sort()

    const futureFirst = futureCounts[tiedLetters[0] as keyof typeof futureCounts]
    const futureSecond = futureCounts[tiedLetters[1] as keyof typeof futureCounts]

    let primary: string, secondary: string
    if (futureFirst > futureSecond) {
      primary = tiedLetters[0]
      secondary = tiedLetters[1]
    } else if (futureSecond > futureFirst) {
      primary = tiedLetters[1]
      secondary = tiedLetters[0]
    } else {
      if (answers.q6 === tiedLetters[0]) {
        primary = tiedLetters[0]
        secondary = tiedLetters[1]
      } else if (answers.q6 === tiedLetters[1]) {
        primary = tiedLetters[1]
        secondary = tiedLetters[0]
      } else {
        primary = tiedLetters[0]
        secondary = tiedLetters[1]
      }
    }

    if ((primary === 'A' && secondary === 'B') || (primary === 'B' && secondary === 'A')) {
      return 'guardian-builder'
    }
    if ((primary === 'B' && secondary === 'C') || (primary === 'C' && secondary === 'B')) {
      return 'builder-shaper'
    }
    if ((primary === 'A' && secondary === 'C') || (primary === 'C' && secondary === 'A')) {
      return 'adaptive-guardian'
    }
  }

  const futureSorted = Object.entries(futureCounts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [futureFirst, futureSecond] = futureSorted

  if (futureFirst[1] > futureSecond[1]) {
    if (futureFirst[0] === 'A') return 'guardian'
    if (futureFirst[0] === 'B') return 'builder'
    return 'shaper'
  }

  if (answers.q6 === 'A') return 'guardian'
  if (answers.q6 === 'B') return 'builder'
  if (answers.q6 === 'C') return 'shaper'

  return 'builder'
}

// Scene descriptions for each profile type
const profileScenes: Record<ProfileType, string> = {
  guardian: 'a Singapore Civil Defence emergency preparedness scene, with uniformed personnel conducting a community training exercise, emergency response vehicles, safety equipment, and citizens participating in a neighbourhood safety drill at a modern HDB void deck',

  builder: 'a warm gotong royong community scene in a Singapore HDB neighbourhood, with diverse residents of all ages helping each other, community gardening, sharing food at a void deck gathering, and neighbours bonding together in a spirit of unity',

  shaper: 'a futuristic Smart Nation Singapore scene, with innovative technology displays, autonomous vehicles, holographic interfaces, citizens using cutting-edge devices, and sleek sustainable architecture showcasing Singapore as a global innovation hub',

  'guardian-builder': 'a Singapore community resilience scene combining emergency preparedness with neighbourhood unity, showing citizens participating in a Community Emergency Response training together, with Civil Defence volunteers teaching safety skills to diverse residents at a modern HDB community centre',

  'builder-shaper': 'a forward-looking Singapore community innovation scene, with residents collaborating on smart neighbourhood initiatives, a community tech hub with digital literacy programs, and citizens of all ages embracing new technology together while maintaining strong social bonds',

  'adaptive-guardian': 'a dynamic Singapore scene blending security with innovation, showing smart city infrastructure with advanced monitoring systems, citizens using technology for emergency preparedness, and futuristic Civil Defence capabilities protecting a modern Singapore skyline',
}

const profileStyles: Record<ProfileType, string> = {
  guardian: 'professional and reassuring atmosphere, organized and structured composition, warm daylight, clean and orderly, modern photography style',

  builder: 'warm and welcoming atmosphere, soft golden hour lighting, heartwarming composition with people connecting, vibrant but gentle colors, documentary photography style',

  shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with accent neon highlights, sleek and modern composition, cinematic futuristic style',

  'guardian-builder': 'balanced atmosphere of security and warmth, organized yet welcoming composition, natural daylight with warm undertones, professional documentary style',

  'builder-shaper': 'optimistic and progressive atmosphere, bright and modern lighting, inclusive composition showing community and technology, contemporary lifestyle photography style',

  'adaptive-guardian': 'confident and forward-looking atmosphere, dramatic lighting with cool modern tones, dynamic composition showing strength and innovation, cinematic style',
}

// Build prompt based on profile type
function buildPrompt(profileType: ProfileType): string {
  const scene = profileScenes[profileType]
  const style = profileStyles[profileType]

  return `A photorealistic scene of ${scene}. Singapore setting with recognizable local elements. ${style}. High quality, detailed, 8k resolution. The person should be naturally integrated into the scene.`
}

interface GenerateRequest {
  photo: string // base64 image data
  answers: QuizAnswers
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request)
  const rateLimit = checkRateLimit(clientIP)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
        },
      }
    )
  }

  try {
    // Check Content-Length header first (before parsing body)
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_PHOTO_SIZE + 1024) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      )
    }

    const body: GenerateRequest = await request.json()
    const { photo, answers } = body

    // Validate photo size (base64 string length)
    if (!photo || photo.length > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        { error: 'Photo is missing or too large (max 5MB)' },
        { status: 400 }
      )
    }

    // Validate quiz answers against whitelist
    if (!validateAnswers(answers)) {
      return NextResponse.json(
        { error: 'Invalid quiz answers' },
        { status: 400 }
      )
    }

    // Calculate profile and build prompt
    const profileType = calculateProfile(answers)
    const prompt = buildPrompt(profileType)

    // Call the Cloudflare Worker with API key authentication
    // Note: Worker still expects 'past'|'present'|'future' for R2 path organization
    // We use 'present' as default since profileType doesn't map to these values
    const workerResponse = await fetch(`${WORKER_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WORKER_API_KEY && { 'X-API-Key': WORKER_API_KEY }),
      },
      body: JSON.stringify({
        photo,
        prompt,
        timePeriod: 'present', // Worker uses this for R2 path; profile is in the prompt
      }),
    })

    if (!workerResponse.ok) {
      const error = await workerResponse.text()
      console.error('Worker error:', error)
      // Don't expose internal error details to client
      throw new Error('Image generation service error')
    }

    const result = await workerResponse.json()

    return NextResponse.json({
      imageUrl: result.imageUrl,  // FAL.ai URL for immediate display
      r2Path: result.r2Path,      // Path for R2 upload
      prompt,
      profileType,
      mode: 'production',
    })
  } catch (error) {
    console.error('Generate API error:', error)
    // Don't expose internal error details in production
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    )
  }
}
