/**
 * Monitor R2 image loading speed from browser
 * Opens browser for manual testing and logs network timings
 */

import { chromium } from 'playwright'

const SITE_URL = 'https://riversidesec.pages.dev'

interface ImageTiming {
  index: number
  apiResponseTime?: number
  r2LoadTime?: number
  imageUrl?: string
  timestamp: string
}

async function main() {
  console.log('='.repeat(60))
  console.log('R2 Speed Monitor - Browser Test')
  console.log('='.repeat(60))
  console.log(`\nOpening ${SITE_URL}`)
  console.log('Generate images manually - timings will be logged here.\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  const timings: ImageTiming[] = []
  let imageCount = 0
  let currentApiStart = 0

  // Monitor API calls to /generate
  page.on('request', request => {
    if (request.url().includes('/generate') && request.method() === 'POST') {
      currentApiStart = Date.now()
      console.log(`[${new Date().toLocaleTimeString()}] API request started...`)
    }
  })

  page.on('response', async response => {
    const url = response.url()

    // Monitor /generate API response
    if (url.includes('/generate') && response.request().method() === 'POST') {
      const apiTime = Date.now() - currentApiStart
      imageCount++

      try {
        const data = await response.json()
        console.log(`\n[Image ${imageCount}] API Response:`)
        console.log(`  Time: ${apiTime}ms`)
        console.log(`  URL: ${data.imageUrl}`)

        timings.push({
          index: imageCount,
          apiResponseTime: apiTime,
          imageUrl: data.imageUrl,
          timestamp: new Date().toLocaleTimeString(),
        })
      } catch {
        console.log(`  API Time: ${apiTime}ms (couldn't parse response)`)
      }
    }

    // Monitor R2 image loads
    if (url.includes('riversidesec.eugene-ff3.workers.dev/images/generated')) {
      const timing = response.request().timing()
      const loadTime = timing.responseEnd - timing.requestStart

      // Find matching timing entry
      const entry = timings.find(t => t.imageUrl === url && !t.r2LoadTime)
      if (entry) {
        entry.r2LoadTime = Math.round(loadTime)
        console.log(`  R2 Load: ${entry.r2LoadTime}ms`)
      } else {
        console.log(`[R2 Load] ${url.split('/').pop()}: ${Math.round(loadTime)}ms`)
      }
    }
  })

  await page.goto(SITE_URL)

  console.log('Browser ready! Generate 5 images manually.')
  console.log('Press Ctrl+C when done to see summary.\n')
  console.log('-'.repeat(60))

  // Keep running until user closes
  process.on('SIGINT', () => {
    console.log('\n\n' + '='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))

    if (timings.length > 0) {
      const withR2 = timings.filter(t => t.r2LoadTime)

      console.log(`\nTotal images tracked: ${timings.length}`)

      if (timings.length > 0) {
        const apiTimes = timings.map(t => t.apiResponseTime!).filter(Boolean)
        if (apiTimes.length > 0) {
          console.log('\nAPI Response Times:')
          console.log(`  Min: ${Math.min(...apiTimes)}ms`)
          console.log(`  Max: ${Math.max(...apiTimes)}ms`)
          console.log(`  Avg: ${Math.round(apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length)}ms`)
        }
      }

      if (withR2.length > 0) {
        const r2Times = withR2.map(t => t.r2LoadTime!)
        console.log('\nR2 Image Load Times:')
        console.log(`  Min: ${Math.min(...r2Times)}ms`)
        console.log(`  Max: ${Math.max(...r2Times)}ms`)
        console.log(`  Avg: ${Math.round(r2Times.reduce((a, b) => a + b, 0) / r2Times.length)}ms`)
      }

      console.log('\nDetailed:')
      for (const t of timings) {
        console.log(`  [${t.index}] API: ${t.apiResponseTime}ms, R2: ${t.r2LoadTime || 'N/A'}ms`)
      }
    } else {
      console.log('No images were generated.')
    }

    browser.close()
    process.exit(0)
  })

  // Keep script running
  await new Promise(() => {})
}

main().catch(console.error)
