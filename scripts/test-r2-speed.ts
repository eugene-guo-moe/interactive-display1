/**
 * Test R2 image loading speed
 * Generates 10 images and measures:
 * 1. Total API response time (FAL.ai generation + fetch + R2 upload)
 * 2. R2 image load time (how fast end users can load the image)
 */

import * as fs from 'fs'
import * as path from 'path'

const WORKER_URL = 'https://riversidesec.eugene-ff3.workers.dev'
const API_KEY = process.env.WORKER_API_KEY || ''

// Use a small test image
const TEST_IMAGE_PATH = path.join(__dirname, 'test-face.jpg')

interface TestResult {
  index: number
  apiResponseTime: number
  r2LoadTime: number
  imageUrl: string
  success: boolean
  error?: string
}

async function getTestImage(): Promise<string> {
  // Check if test image exists, if not download one
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.log('Downloading test image...')
    const response = await fetch('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80')
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(TEST_IMAGE_PATH, Buffer.from(buffer))
  }

  const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH)
  return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
}

async function generateImage(index: number, photoBase64: string): Promise<TestResult> {
  const timePeriods = ['past', 'present', 'future'] as const
  const timePeriod = timePeriods[index % 3]

  const prompts: Record<string, string> = {
    past: 'Person in 1960s Singapore kampung village, wooden houses on stilts, coconut trees',
    present: 'Person at Marina Bay Sands, modern Singapore skyline, Gardens by the Bay',
    future: 'Person in futuristic Singapore 2100, flying vehicles, holographic displays',
  }

  console.log(`\n[${index + 1}/10] Generating ${timePeriod} image...`)

  const startTime = Date.now()

  try {
    const response = await fetch(`${WORKER_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        photo: photoBase64,
        prompt: prompts[timePeriod],
        timePeriod,
      }),
    })

    const apiResponseTime = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      return {
        index: index + 1,
        apiResponseTime,
        r2LoadTime: 0,
        imageUrl: '',
        success: false,
        error: `API error: ${response.status} - ${error}`,
      }
    }

    const data = await response.json() as { imageUrl: string; qrUrl: string }
    console.log(`  API response: ${apiResponseTime}ms`)
    console.log(`  Image URL: ${data.imageUrl}`)

    // Now measure R2 load time
    const r2StartTime = Date.now()
    const imageResponse = await fetch(data.imageUrl)
    if (!imageResponse.ok) {
      return {
        index: index + 1,
        apiResponseTime,
        r2LoadTime: 0,
        imageUrl: data.imageUrl,
        success: false,
        error: `R2 load error: ${imageResponse.status}`,
      }
    }

    // Read the full image to simulate browser loading
    await imageResponse.arrayBuffer()
    const r2LoadTime = Date.now() - r2StartTime

    console.log(`  R2 load time: ${r2LoadTime}ms`)

    return {
      index: index + 1,
      apiResponseTime,
      r2LoadTime,
      imageUrl: data.imageUrl,
      success: true,
    }
  } catch (error) {
    return {
      index: index + 1,
      apiResponseTime: Date.now() - startTime,
      r2LoadTime: 0,
      imageUrl: '',
      success: false,
      error: `Exception: ${error}`,
    }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('R2 Speed Test - 10 Image Generation')
  console.log('='.repeat(60))

  if (!API_KEY) {
    console.error('Error: WORKER_API_KEY environment variable not set')
    process.exit(1)
  }

  const photoBase64 = await getTestImage()
  console.log(`Test image loaded (${Math.round(photoBase64.length / 1024)}KB base64)`)

  const results: TestResult[] = []

  // Run tests sequentially to avoid rate limiting
  for (let i = 0; i < 10; i++) {
    const result = await generateImage(i, photoBase64)
    results.push(result)

    // Small delay between requests to avoid rate limiting
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('RESULTS SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\nSuccessful: ${successful.length}/10`)
  console.log(`Failed: ${failed.length}/10`)

  if (successful.length > 0) {
    const apiTimes = successful.map(r => r.apiResponseTime)
    const r2Times = successful.map(r => r.r2LoadTime)

    console.log('\nAPI Response Times (includes FAL.ai gen + fetch + R2 upload):')
    console.log(`  Min: ${Math.min(...apiTimes)}ms`)
    console.log(`  Max: ${Math.max(...apiTimes)}ms`)
    console.log(`  Avg: ${Math.round(apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length)}ms`)

    console.log('\nR2 Image Load Times (what end users experience):')
    console.log(`  Min: ${Math.min(...r2Times)}ms`)
    console.log(`  Max: ${Math.max(...r2Times)}ms`)
    console.log(`  Avg: ${Math.round(r2Times.reduce((a, b) => a + b, 0) / r2Times.length)}ms`)

    console.log('\nDetailed Results:')
    console.log('-'.repeat(60))
    console.log('| # | API Time | R2 Load | Status |')
    console.log('-'.repeat(60))
    for (const r of results) {
      const status = r.success ? '✓' : `✗ ${r.error?.substring(0, 30)}`
      console.log(`| ${r.index.toString().padStart(2)} | ${r.apiResponseTime.toString().padStart(7)}ms | ${r.r2LoadTime.toString().padStart(6)}ms | ${status} |`)
    }
    console.log('-'.repeat(60))
  }

  if (failed.length > 0) {
    console.log('\nFailed requests:')
    for (const r of failed) {
      console.log(`  [${r.index}] ${r.error}`)
    }
  }
}

main().catch(console.error)
