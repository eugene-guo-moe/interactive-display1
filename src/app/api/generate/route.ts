import { NextRequest, NextResponse } from 'next/server'
import type { QuizAnswers } from '@/types/quiz'

export const runtime = 'edge'

// Worker URL - hardcoded for now
const WORKER_URL = 'https://riversidesec.eugene-ff3.workers.dev'

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
  generationMethod?: 'v1' | 'v2' // v1 = face swap, v2 = inpainting
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { photo, answers, generationMethod = 'v1' } = body

    // Validate inputs
    if (!photo || !answers.q1 || !answers.q2 || !answers.q3) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Build the scene prompt based on answers
    const prompt = buildPrompt(answers)
    const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'

    // Choose endpoint based on generation method
    // v1 = face swap pipeline (original)
    // v2 = inpainting pipeline (preserves user's actual appearance)
    const endpoint = generationMethod === 'v2' ? '/generate-v2' : '/generate'
    console.log(`Using generation method: ${generationMethod} (${endpoint})`)

    // Call the Cloudflare Worker
    const workerResponse = await fetch(`${WORKER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photo,
        prompt,
        timePeriod,
      }),
    })

    if (!workerResponse.ok) {
      const error = await workerResponse.text()
      throw new Error(`Worker error: ${error}`)
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
      generationMethod,
    })
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
