import { NextRequest, NextResponse } from 'next/server'
import type { QuizAnswers } from '@/types/quiz'

export const runtime = 'edge'

// Worker URL from environment variable
const WORKER_URL = process.env.WORKER_URL || 'https://riversidesec.eugene-ff3.workers.dev'
const WORKER_API_KEY = process.env.WORKER_API_KEY || ''

// Security constants
const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB max for base64 string
const VALID_Q1_Q2_ANSWERS = ['A', 'B', 'C', 'D'] as const
const VALID_Q3_ANSWERS = ['A', 'B', 'C'] as const

// Validate quiz answers against whitelist
function validateAnswers(answers: QuizAnswers): boolean {
  if (!answers.q1 || !answers.q2 || !answers.q3) return false
  if (!VALID_Q1_Q2_ANSWERS.includes(answers.q1 as typeof VALID_Q1_Q2_ANSWERS[number])) return false
  if (!VALID_Q1_Q2_ANSWERS.includes(answers.q2 as typeof VALID_Q1_Q2_ANSWERS[number])) return false
  if (!VALID_Q3_ANSWERS.includes(answers.q3 as typeof VALID_Q3_ANSWERS[number])) return false
  return true
}

// Build prompt based on quiz answers (inlined to avoid import issues)
function buildPrompt(answers: QuizAnswers): string {
  const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'
  const q1Answer = answers.q1 || 'A'
  const q2Answer = answers.q2 || 'A'

  const pastScenes: Record<string, string> = {
    A: 'a warm kampung village scene with wooden houses on stilts, coconut trees, and community gathering',
    B: 'a vibrant 1960s Singapore street scene with diverse cultures, traditional shophouses, and street vendors',
    C: 'a vintage Singapore port scene with colonial architecture and early technological innovations',
    D: 'a lush tropical garden setting with old Singapore botanic gardens and traditional greenery',
  }

  const presentScenes: Record<string, string> = {
    A: 'a modern HDB heartland scene with community centers, hawker centers, and neighborhood vibes',
    B: 'a vibrant Chinatown or Little India street scene with modern Singapore multiculturalism',
    C: 'the iconic Marina Bay skyline at golden hour with Gardens by the Bay and the Supertrees',
    D: 'Gardens by the Bay with the Cloud Forest and Flower Dome, lush greenery and modern architecture',
  }

  const futureScenes: Record<string, string> = {
    A: 'a futuristic community hub with holographic displays and connected smart homes',
    B: 'a cyberpunk multicultural festival with neon lights and diverse cultural holograms',
    C: 'a high-tech Singapore skyline with flying vehicles, AI assistants, and smart infrastructure',
    D: 'a green futuristic city with vertical gardens, solar panels, and sustainable architecture',
  }

  const iconModifiers: Record<string, { past: string; present: string; future: string }> = {
    A: {
      past: 'with the historic National Library building visible in the background, colonial era architecture',
      present: 'with the modern National Library at Victoria Street, contemporary Singapore',
      future: 'with a reimagined holographic National Library floating in the sky',
    },
    B: {
      past: 'with the original Merlion statue by the Singapore River, 1970s aesthetic',
      present: 'with the iconic Merlion at Marina Bay, present day Singapore',
      future: 'with a giant holographic Merlion projecting from Marina Bay',
    },
    C: {
      past: 'with early Marina Bay development, construction cranes and 1990s Singapore skyline',
      present: 'with Marina Bay Sands and the ArtScience Museum, modern Singapore skyline',
      future: 'with a futuristic Marina Bay Sands featuring floating infinity pools and light shows',
    },
    D: {
      past: 'with Changi Airport in its early days, vintage planes and retro terminals',
      present: 'with Jewel Changi Airport and the HSBC Rain Vortex waterfall',
      future: 'with Jewel Changi transformed into a space-age biodome with alien plants',
    },
  }

  const baseScene = timePeriod === 'past'
    ? pastScenes[q1Answer] || pastScenes.A
    : timePeriod === 'present'
      ? presentScenes[q1Answer] || presentScenes.A
      : futureScenes[q1Answer] || futureScenes.A

  const iconDetail = iconModifiers[q2Answer]?.[timePeriod] || iconModifiers.A[timePeriod]

  const style = timePeriod === 'past'
    ? 'warm sepia tones, nostalgic atmosphere, soft golden sunlight, vintage film photography style'
    : timePeriod === 'present'
      ? 'vibrant colors, golden hour lighting, modern photography style, clean and contemporary'
      : 'vibrant neon colors, cyberpunk aesthetic, dramatic lighting, cinematic sci-fi style'

  return `A photorealistic scene of ${baseScene}, ${iconDetail}. Singapore setting. ${style}. High quality, detailed, 8k resolution.`
}

interface GenerateRequest {
  photo: string // base64 image data
  answers: QuizAnswers
}

export async function POST(request: NextRequest) {
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

    // Build the scene prompt based on answers
    const prompt = buildPrompt(answers)
    const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'

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
        timePeriod,
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
      imageUrl: result.imageUrl,
      qrUrl: result.qrUrl,
      sceneUrl: result.sceneUrl,
      cutoutUrl: result.cutoutUrl,
      prompt,
      timePeriod,
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
