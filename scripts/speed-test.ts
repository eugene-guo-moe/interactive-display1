#!/usr/bin/env npx ts-node

/**
 * Speed test script - tests 3 random images in parallel to measure generation time
 * Run with: npx ts-node scripts/speed-test.ts
 */

const WORKER_URL = process.env.WORKER_URL || 'https://riversidesec.eugene-ff3.workers.dev'
const API_KEY = process.env.WORKER_API_KEY || ''

// Random Unsplash portraits
const testImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&q=80', // man portrait
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=512&q=80', // woman smiling
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=512&q=80', // man casual
]

// Test with different time periods
const testConfigs = [
  { q1: 'A', q2: 'B', q3: 'A', label: 'Past - Kampung/Merlion' },
  { q1: 'C', q2: 'C', q3: 'B', label: 'Present - Tech/MBS' },
  { q1: 'B', q2: 'D', q3: 'C', label: 'Future - Culture/Jewel' },
]

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = response.headers.get('content-type') || 'image/jpeg'
  return `data:${mimeType};base64,${base64}`
}

function buildPrompt(answers: { q1: string; q2: string; q3: string }): string {
  const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'

  const pastScenes: Record<string, string> = {
    A: 'a warm kampung village scene with wooden houses on stilts, coconut trees',
    B: 'a vibrant 1960s Singapore street scene with diverse cultures, traditional shophouses',
    C: 'a vintage Singapore port scene with colonial architecture',
    D: 'a lush tropical garden setting with old Singapore botanic gardens',
  }

  const presentScenes: Record<string, string> = {
    A: 'a modern HDB heartland scene with community centers, hawker centers',
    B: 'a vibrant Chinatown or Little India street scene',
    C: 'the iconic Marina Bay skyline at golden hour with Gardens by the Bay',
    D: 'Gardens by the Bay with the Cloud Forest and Flower Dome',
  }

  const futureScenes: Record<string, string> = {
    A: 'a futuristic community hub with holographic displays',
    B: 'a cyberpunk multicultural festival with neon lights',
    C: 'a high-tech Singapore skyline with flying vehicles',
    D: 'a green futuristic city with vertical gardens',
  }

  const iconModifiers: Record<string, { past: string; present: string; future: string }> = {
    A: {
      past: 'with the historic National Library building',
      present: 'with the modern National Library',
      future: 'with a holographic National Library',
    },
    B: {
      past: 'with the original Merlion statue',
      present: 'with the iconic Merlion at Marina Bay',
      future: 'with a giant holographic Merlion',
    },
    C: {
      past: 'with early Marina Bay development',
      present: 'with Marina Bay Sands and ArtScience Museum',
      future: 'with futuristic Marina Bay Sands',
    },
    D: {
      past: 'with Changi Airport in its early days',
      present: 'with Jewel Changi Airport',
      future: 'with Jewel transformed into a space-age biodome',
    },
  }

  const scenes = timePeriod === 'past' ? pastScenes : timePeriod === 'present' ? presentScenes : futureScenes
  const baseScene = scenes[answers.q1] || scenes.A
  const iconDetail = iconModifiers[answers.q2]?.[timePeriod] || iconModifiers.A[timePeriod]

  return `A photorealistic scene of ${baseScene}, ${iconDetail}. Singapore setting. High quality.`
}

async function generateImage(
  photoBase64: string,
  config: { q1: string; q2: string; q3: string; label: string },
  index: number
): Promise<{ index: number; label: string; success: boolean; duration: number; imageUrl?: string; error?: string }> {
  const timePeriod = config.q3 === 'A' ? 'past' : config.q3 === 'B' ? 'present' : 'future'
  const startTime = Date.now()

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY
    }

    const response = await fetch(`${WORKER_URL}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        photo: photoBase64,
        prompt: buildPrompt(config),
        timePeriod,
      }),
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      return { index, label: config.label, success: false, duration, error: `HTTP ${response.status}: ${error}` }
    }

    const result = (await response.json()) as { imageUrl?: string }
    return { index, label: config.label, success: true, duration, imageUrl: result.imageUrl }
  } catch (err) {
    const duration = Date.now() - startTime
    return { index, label: config.label, success: false, duration, error: String(err) }
  }
}

async function main() {
  console.log('=== Speed Test: 3 Images in Parallel ===\n')
  console.log(`Worker URL: ${WORKER_URL}`)
  console.log(`API Key: ${API_KEY ? '(set)' : '(not set)'}\n`)

  // Pre-fetch all images
  console.log('Fetching test images...')
  const fetchStart = Date.now()
  const photoPromises = testImages.map(async (url, i) => {
    const base64 = await fetchImageAsBase64(url)
    console.log(`  [${i + 1}] Fetched ${url.substring(0, 50)}...`)
    return base64
  })
  const photos = await Promise.all(photoPromises)
  console.log(`Images fetched in ${Date.now() - fetchStart}ms\n`)

  // Run all 3 generations in parallel
  console.log('Starting parallel generation...')
  const genStart = Date.now()

  const results = await Promise.all(
    photos.map((photo, i) => generateImage(photo, testConfigs[i], i + 1))
  )

  const totalTime = Date.now() - genStart

  // Print results
  console.log('\n=== Results ===\n')

  results.forEach((r) => {
    const status = r.success ? '✓' : '✗'
    const time = (r.duration / 1000).toFixed(2)
    console.log(`[${r.index}] ${status} ${r.label}`)
    console.log(`    Time: ${time}s`)
    if (r.success) {
      console.log(`    URL: ${r.imageUrl}`)
    } else {
      console.log(`    Error: ${r.error}`)
    }
    console.log()
  })

  // Summary
  const successful = results.filter((r) => r.success)
  const avgTime = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    : 0

  console.log('=== Summary ===')
  console.log(`Total wall-clock time: ${(totalTime / 1000).toFixed(2)}s`)
  console.log(`Successful: ${successful.length}/3`)
  console.log(`Average per image: ${(avgTime / 1000).toFixed(2)}s`)
  console.log(`Fastest: ${(Math.min(...successful.map((r) => r.duration)) / 1000).toFixed(2)}s`)
  console.log(`Slowest: ${(Math.max(...successful.map((r) => r.duration)) / 1000).toFixed(2)}s`)
}

main().catch(console.error)
