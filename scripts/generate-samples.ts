#!/usr/bin/env npx ts-node

/**
 * Script to generate sample images using people photos from Unsplash
 * Run with: npx ts-node scripts/generate-samples.ts
 */

const WORKER_URL = 'https://riversidesec.eugene-ff3.workers.dev'

// Unsplash people portrait photos (free to use)
const unsplashPeople = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&q=80', // man portrait
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=512&q=80', // woman smiling
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=512&q=80', // man casual
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=512&q=80', // woman portrait
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=512&q=80', // man glasses
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=512&q=80', // woman fashion
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=512&q=80', // man beard
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=512&q=80', // woman natural
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=512&q=80', // man young
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=512&q=80', // woman closeup
]

// Quiz answer combinations for variety
const answerCombos = [
  { q1: 'A', q2: 'A', q3: 'A' }, // past - kampung - national library
  { q1: 'B', q2: 'B', q3: 'A' }, // past - multicultural - merlion
  { q1: 'C', q2: 'C', q3: 'B' }, // present - tech hub - MBS
  { q1: 'D', q2: 'D', q3: 'B' }, // present - green city - jewel
  { q1: 'A', q2: 'B', q3: 'C' }, // future - kampung - merlion
  { q1: 'B', q2: 'C', q3: 'C' }, // future - multicultural - MBS
  { q1: 'C', q2: 'A', q3: 'A' }, // past - tech - national library
  { q1: 'D', q2: 'B', q3: 'B' }, // present - green - merlion
  { q1: 'A', q2: 'D', q3: 'C' }, // future - kampung - jewel
  { q1: 'B', q2: 'A', q3: 'C' }, // future - multicultural - national library
]

async function fetchImageAsBase64(url: string): Promise<string> {
  console.log(`  Fetching image: ${url.substring(0, 60)}...`)
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = response.headers.get('content-type') || 'image/jpeg'
  return `data:${mimeType};base64,${base64}`
}

async function generateImage(
  photoBase64: string,
  answers: { q1: string; q2: string; q3: string },
  index: number
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'
  console.log(`  Generating image ${index + 1} (${timePeriod})...`)

  try {
    const response = await fetch(`${WORKER_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photo: photoBase64,
        prompt: buildPrompt(answers),
        timePeriod,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${error}` }
    }

    const result = await response.json() as { imageUrl?: string }
    return { success: true, imageUrl: result.imageUrl }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

function buildPrompt(answers: { q1: string; q2: string; q3: string }): string {
  const timePeriod = answers.q3 === 'A' ? 'past' : answers.q3 === 'B' ? 'present' : 'future'

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

  const scenes = timePeriod === 'past' ? pastScenes : timePeriod === 'present' ? presentScenes : futureScenes
  const baseScene = scenes[answers.q1] || scenes.A
  const iconDetail = iconModifiers[answers.q2]?.[timePeriod] || iconModifiers.A[timePeriod]

  const style = timePeriod === 'past'
    ? 'warm sepia tones, nostalgic atmosphere, soft golden sunlight, vintage film photography style'
    : timePeriod === 'present'
      ? 'vibrant colors, golden hour lighting, modern photography style, clean and contemporary'
      : 'vibrant neon colors, cyberpunk aesthetic, dramatic lighting, cinematic sci-fi style'

  return `A photorealistic scene of ${baseScene}, ${iconDetail}. Singapore setting. ${style}. High quality, detailed, 8k resolution.`
}

async function main() {
  console.log('=== Generating 10 Sample Images ===\n')

  const results: { index: number; success: boolean; imageUrl?: string; error?: string }[] = []

  for (let i = 0; i < 10; i++) {
    console.log(`\n[${i + 1}/10] Processing...`)

    try {
      // Fetch the person image
      const photoBase64 = await fetchImageAsBase64(unsplashPeople[i])

      // Generate the image
      const result = await generateImage(photoBase64, answerCombos[i], i)
      results.push({ index: i + 1, ...result })

      if (result.success) {
        console.log(`  Success! URL: ${result.imageUrl}`)
      } else {
        console.log(`  Failed: ${result.error}`)
      }
    } catch (err) {
      console.log(`  Error: ${err}`)
      results.push({ index: i + 1, success: false, error: String(err) })
    }

    // Small delay between requests
    if (i < 9) {
      console.log('  Waiting 2s before next request...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log('\n\n=== Summary ===')
  console.log(`Successful: ${results.filter(r => r.success).length}/10`)
  console.log(`Failed: ${results.filter(r => !r.success).length}/10`)

  console.log('\n=== Generated Image URLs ===')
  results.filter(r => r.success).forEach(r => {
    console.log(`${r.index}. ${r.imageUrl}`)
  })

  if (results.some(r => !r.success)) {
    console.log('\n=== Errors ===')
    results.filter(r => !r.success).forEach(r => {
      console.log(`${r.index}. ${r.error}`)
    })
  }
}

main().catch(console.error)
