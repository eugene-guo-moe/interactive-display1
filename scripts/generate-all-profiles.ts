import * as fs from 'fs'
import * as path from 'path'

const WORKER_URL = 'https://interactive-display.eugene-ff3.workers.dev'
const API_KEY = '5CSVqaHCxtWPL1PSEbMlMbI3AVeZmQh5'

const profiles = [
  'guardian',
  'steward',
  'shaper',
  'guardian-steward',
  'steward-shaper',
  'adaptive-guardian'
] as const

async function main() {
  // Read and encode the image
  const imagePath = '/tmp/test-face.jpg'
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const photoData = `data:image/jpeg;base64,${base64Image}`

  console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`)

  // Create output directory
  const outputDir = path.join(process.cwd(), 'generated-cards')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Generate for each profile
  for (const profile of profiles) {
    console.log(`\nGenerating ${profile}...`)

    try {
      const response = await fetch(`${WORKER_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          photo: photoData,
          prompt: getPrompt(profile),
          timePeriod: profile,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`  Failed: ${response.status} ${error}`)
        continue
      }

      const data = await response.json() as { imageUrl: string; r2Path: string }
      console.log(`  Generated: ${data.imageUrl.substring(0, 60)}...`)

      // Download the image
      const imageResponse = await fetch(data.imageUrl)
      const imageArrayBuffer = await imageResponse.arrayBuffer()
      const imageData = Buffer.from(imageArrayBuffer)

      // Save locally
      const ext = data.imageUrl.includes('.png') ? 'png' : 'jpg'
      const outputPath = path.join(outputDir, `${profile}.${ext}`)
      fs.writeFileSync(outputPath, imageData)
      console.log(`  Saved: ${outputPath}`)

    } catch (error) {
      console.error(`  Error: ${error}`)
    }
  }

  console.log('\nDone!')
}

function getPrompt(profile: string): string {
  const scenes: Record<string, string> = {
    guardian: 'medium close-up portrait of a single person standing confidently, wearing a plain dark blue police uniform with no text, badges, or logos. A white and blue police patrol car is parked behind them. The Merlion is visible in the background near Marina Bay, with the orderly civic skyline beyond. Clean public space, looking directly at the camera',
    steward: 'medium close-up portrait of a single person standing inside a Singapore Community Club. Behind the person, a clearly visible community club activity board displays posters for neighbourhood events, classes, and workshops. Multi-purpose rooms with tables and chairs are visible, and a blurred mix of residents of different ages and backgrounds are engaged in activities. The setting features clean public interiors typical of Singapore community clubs, with warm indoor lighting and an orderly, welcoming atmosphere. The person looks directly at the camera with a composed, approachable expression',
    shaper: 'a single person holding a glowing holographic tablet, standing on an elevated waterfront promenade overlooking Marina Bay. Marina Bay Sands dominates the background, integrated into a smart city skyline with illuminated data overlays, digital interfaces, and connected infrastructure. Autonomous transport routes and smart urban systems are subtly visualised around the skyline. Cool blue and teal lighting, the person stands confidently and looks directly at the camera',
    'guardian-steward': 'a single person organizing food supplies at a Singapore community soup kitchen located within a public service facility. Large pots of soup and trays of vegetables are in the foreground, with blurred volunteers behind. The environment resembles a neighbourhood polyclinic or community hub, warm indoor lighting, looking at the camera',
    'steward-shaper': 'a single person leaning forward demonstrating a smartphone to an elderly person seen from behind with grey hair. The scene takes place inside Jewel Changi Airport, with indoor greenery, glass architecture, and natural light filtering through. Warm, friendly atmosphere focused on inclusion and learning',
    'adaptive-guardian': 'a single person standing in a modern cybersecurity operations centre. Multiple screens display network monitoring dashboards and security alerts. Through glass walls, Changi Airport\'s control infrastructure or runway lighting is visible in the distance. Blue ambient lighting, looking confidently at the camera',
  }

  const styles: Record<string, string> = {
    guardian: 'professional and reassuring atmosphere, structured composition, warm tropical daylight, clean civic surroundings around Marina Bay, modern Singapore public infrastructure, contemporary photography style',
    steward: 'warm and welcoming atmosphere, soft golden hour tropical lighting, heartland community setting, everyday Singapore life, vibrant but gentle colours, documentary photography style',
    shaper: 'dynamic and innovative atmosphere, cool blue and teal tones with subtle neon highlights, Marina Bay Sands-centred futuristic skyline, sleek modern composition, cinematic style grounded in realism',
    'guardian-steward': 'balanced atmosphere of security and warmth, organized yet welcoming composition, public service and community care setting, natural tropical lighting, professional documentary style',
    'steward-shaper': 'optimistic and progressive atmosphere, bright modern tropical lighting, Jewel Changi\'s greenery and glass architecture, inclusive composition showing people and technology, contemporary lifestyle photography style',
    'adaptive-guardian': 'confident and forward-looking atmosphere, dramatic cool-toned lighting, advanced operations environment linked to Changi Airport infrastructure, dynamic cinematic composition',
  }

  const scene = scenes[profile] || scenes.steward
  const style = styles[profile] || styles.steward

  return `A photorealistic medium close-up scene of ${scene}. Set in an authentic Singapore environment with curated iconic landmarks or public spaces that symbolically match the profile. Recognisable local architectural details, urban greenery, and everyday Singapore elements are clearly visible. ${style}. High quality, highly detailed, realistic lighting, 8k resolution. The person is naturally integrated into the environment, with no visible text, logos, or branded symbols. Non-touristy, contemporary Singapore realism.`
}

main().catch(console.error)
