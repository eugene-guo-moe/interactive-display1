import { NextRequest, NextResponse } from 'next/server'
import type { QuizAnswers, ProfileType } from '@/types/quiz'

export const runtime = 'edge'
export const maxDuration = 60 // Allow up to 60 seconds for FAL.ai generation

// Worker URL from environment variable
const WORKER_URL = 'https://interactive-display.eugene-ff3.workers.dev'
const WORKER_API_KEY = process.env.WORKER_API_KEY || '5CSVqaHCxtWPL1PSEbMlMbI3AVeZmQh5'

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
    if (first[0] === 'B') return 'steward'
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
      return 'guardian-steward'
    }
    if ((primary === 'B' && secondary === 'C') || (primary === 'C' && secondary === 'B')) {
      return 'steward-shaper'
    }
    if ((primary === 'A' && secondary === 'C') || (primary === 'C' && secondary === 'A')) {
      return 'adaptive-guardian'
    }
  }

  const futureSorted = Object.entries(futureCounts).sort((a, b) => b[1] - a[1]) as [string, number][]
  const [futureFirst, futureSecond] = futureSorted

  if (futureFirst[1] > futureSecond[1]) {
    if (futureFirst[0] === 'A') return 'guardian'
    if (futureFirst[0] === 'B') return 'steward'
    return 'shaper'
  }

  if (answers.q6 === 'A') return 'guardian'
  if (answers.q6 === 'B') return 'steward'
  if (answers.q6 === 'C') return 'shaper'

  return 'steward'
}

// Scene descriptions for each profile type
// IMPORTANT: Prompts focus on a SINGLE PERSON (the user) to ensure PuLID preserves their face
const profileScenes: Record<ProfileType, string> = {
  guardian: 'medium close-up portrait of a single person standing confidently, wearing a plain dark blue police uniform with no text, badges, or logos. A white and blue police patrol car is parked behind them. The Merlion is visible in the background near Marina Bay, with the orderly civic skyline beyond. Clean public space, looking directly at the camera',

  steward: 'medium close-up portrait of a single person standing inside a Singapore Community Club. Behind the person, a clearly visible community club activity board displays posters for neighbourhood events, classes, and workshops. Multi-purpose rooms with tables and chairs are visible, and a blurred mix of residents of different ages and backgrounds are engaged in activities. The setting features clean public interiors typical of Singapore community clubs, with warm indoor lighting and an orderly, welcoming atmosphere. The person is mid-gesture in a calm, guiding manner and looks toward the camera with a composed, approachable expression',

  shaper: 'a single person holding a glowing holographic tablet, standing on an elevated waterfront promenade overlooking Marina Bay. Marina Bay Sands dominates the background, integrated into a smart city skyline with illuminated data overlays, digital interfaces, and connected infrastructure. Autonomous transport routes and smart urban systems are subtly visualised around the skyline. Cool blue and teal lighting, the person stands confidently and looks directly at the camera',

  'guardian-steward': 'a single person organizing food supplies at a Singapore community soup kitchen located within a public service facility. Large pots of soup and trays of vegetables are in the foreground, with blurred volunteers behind. The environment resembles a neighbourhood polyclinic or community hub, warm indoor lighting, looking at the camera',

  'steward-shaper': 'a single person leaning forward demonstrating a smartphone to an elderly person seen from behind with grey hair. The scene takes place inside Jewel Changi Airport, with indoor greenery, glass architecture, and natural light filtering through. Warm, friendly atmosphere focused on inclusion and learning',

  'adaptive-guardian': 'a single person standing in a modern cybersecurity operations centre. Multiple screens display network monitoring dashboards and security alerts. Through glass walls, Changi Airport\'s control infrastructure or runway lighting is visible in the distance. Blue ambient lighting, looking confidently at the camera',
}

const profileStyles: Record<ProfileType, string> = {
  guardian: 'professional and reassuring atmosphere, structured composition, warm tropical daylight, clean civic surroundings around Marina Bay, modern Singapore public infrastructure, contemporary photography style',

  steward: 'warm and welcoming atmosphere, soft golden hour tropical lighting, heartland community setting, everyday Singapore life, vibrant but gentle colours, documentary photography style',

  shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with subtle neon highlights, Marina Bay Sands-centred futuristic skyline, sleek modern composition, cinematic style grounded in realism',

  'guardian-steward': 'balanced atmosphere of security and warmth, organized yet welcoming composition, public service and community care setting, natural tropical lighting, professional documentary style',

  'steward-shaper': 'optimistic and progressive atmosphere, bright modern tropical lighting, Jewel Changi\'s greenery and glass architecture, inclusive composition showing people and technology, contemporary lifestyle photography style',

  'adaptive-guardian': 'confident and forward-looking atmosphere, dramatic cool-toned lighting, advanced operations environment linked to Changi Airport infrastructure, dynamic cinematic composition',
}

// Build prompt based on profile type
function buildPrompt(profileType: ProfileType): string {
  const scene = profileScenes[profileType]
  const style = profileStyles[profileType]

  return `A photorealistic medium close-up scene of ${scene}. Set in an authentic Singapore environment with curated iconic landmarks or public spaces that symbolically match the profile. Recognisable local architectural details, urban greenery, and everyday Singapore elements are clearly visible. ${style}. High quality, highly detailed, realistic lighting, 8k resolution. The person is naturally integrated into the environment, with no visible text, logos, or branded symbols. Non-touristy, contemporary Singapore realism.`
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
    const workerResponse = await fetch(`${WORKER_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WORKER_API_KEY && { 'X-API-Key': WORKER_API_KEY }),
      },
      body: JSON.stringify({
        photo,
        prompt,
        timePeriod: profileType, // Used for R2 path organization by profile
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
