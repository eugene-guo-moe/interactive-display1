import * as fs from 'fs'
import * as path from 'path'

// Load API key from .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        process.env[match[1].trim()] = match[2].trim()
      }
    }
  }
}
loadEnv()

const WORKER_URL = 'https://riversidesec.eugene-ff3.workers.dev'
const WORKER_API_KEY = process.env.WORKER_API_KEY || ''

const profiles = ['guardian', 'builder', 'shaper', 'guardian-builder', 'builder-shaper', 'adaptive-guardian'] as const

const profileScenes: Record<string, string> = {
  guardian: 'a single person standing confidently in front of a Singapore Civil Defence training display, wearing a plain orange volunteer vest without any text or logos, emergency response equipment visible behind them at a modern HDB void deck, looking at the camera',

  builder: 'a single person standing warmly in a Singapore HDB void deck decorated for a community event, potted plants and food tables visible in the background, golden hour sunlight streaming through, looking at the camera',

  shaper: 'a single person holding a glowing holographic tablet in futuristic Singapore, smart city architecture and digital displays in the background, autonomous vehicles on elevated roads behind them, looking at the camera',

  'guardian-builder': 'a single person wearing a plain orange safety vest without any text or logos standing at a Singapore HDB community centre, safety equipment arranged in the background, looking at the camera',

  'builder-shaper': 'a single person holding a tablet at a smart community hub in Singapore, digital screens and modern HDB architecture visible in the background, looking at the camera',

  'adaptive-guardian': 'a single person standing at a modern Singapore emergency operations centre, futuristic dashboard screens showing city infrastructure behind them, Marina Bay skyline visible through windows, looking at the camera',
}

const profileStyles: Record<string, string> = {
  guardian: 'professional and reassuring atmosphere, organized and structured composition, warm daylight, clean and orderly, modern photography style',
  builder: 'warm and welcoming atmosphere, soft golden hour lighting, heartwarming composition with people connecting, vibrant but gentle colors, documentary photography style',
  shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with accent neon highlights, sleek and modern composition, cinematic futuristic style',
  'guardian-builder': 'balanced atmosphere of security and warmth, organized yet welcoming composition, natural daylight with warm undertones, professional documentary style',
  'builder-shaper': 'optimistic and progressive atmosphere, bright and modern lighting, inclusive composition showing community and technology, contemporary lifestyle photography style',
  'adaptive-guardian': 'confident and forward-looking atmosphere, dramatic lighting with cool modern tones, dynamic composition showing strength and innovation, cinematic style',
}

function buildPrompt(profileType: string): string {
  const scene = profileScenes[profileType]
  const style = profileStyles[profileType]
  return `A photorealistic scene of ${scene}. Singapore setting with recognizable local elements. ${style}. High quality, detailed, 8k resolution. The person should be naturally integrated into the scene.`
}

async function generateImage(profileType: string, photoBase64: string): Promise<string> {
  const prompt = buildPrompt(profileType)
  console.log(`\n--- Generating ${profileType} ---`)
  console.log(`Prompt: ${prompt.substring(0, 100)}...`)

  const response = await fetch(`${WORKER_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(WORKER_API_KEY && { 'X-API-Key': WORKER_API_KEY }),
    },
    body: JSON.stringify({
      photo: photoBase64,
      prompt,
      timePeriod: profileType,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to generate ${profileType}: ${error}`)
  }

  const result = await response.json() as { imageUrl: string; r2Path: string }
  console.log(`Generated: ${result.imageUrl}`)
  return result.imageUrl
}

async function main() {
  // Read test face image
  const testImagePath = path.join(__dirname, 'test-face.jpg')
  if (!fs.existsSync(testImagePath)) {
    console.error('Test image not found at', testImagePath)
    process.exit(1)
  }

  const imageBuffer = fs.readFileSync(testImagePath)
  const photoBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

  console.log('Starting generation for all 6 profiles...')
  console.log('Test image:', testImagePath)

  const results: Record<string, string> = {}

  for (const profile of profiles) {
    try {
      const imageUrl = await generateImage(profile, photoBase64)
      results[profile] = imageUrl
    } catch (error) {
      console.error(`Error generating ${profile}:`, error)
      results[profile] = 'FAILED'
    }
  }

  console.log('\n\n=== RESULTS ===')
  for (const [profile, url] of Object.entries(results)) {
    console.log(`${profile}: ${url}`)
  }
}

main().catch(console.error)
