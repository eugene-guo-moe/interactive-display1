/**
 * Monitor Approach 2: FAL.ai first, R2 upload in background
 */

import { chromium } from 'playwright'

const SITE_URL = 'https://riversidesec.pages.dev'

async function main() {
  console.log('='.repeat(60))
  console.log('Testing Approach 2: FAL.ai first, R2 in background')
  console.log('='.repeat(60))
  console.log(`\nOpening ${SITE_URL}`)
  console.log('Generate an image and watch the console logs.\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Monitor console logs
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[Result]') || text.includes('R2')) {
      console.log(`[Browser] ${text}`)
    }
  })

  // Monitor API calls
  page.on('request', request => {
    const url = request.url()
    if (url.includes('/generate')) {
      console.log(`\n[API] POST /generate started...`)
    }
    if (url.includes('/upload-to-r2')) {
      console.log(`[API] POST /upload-to-r2 started...`)
    }
  })

  page.on('response', async response => {
    const url = response.url()

    if (url.includes('/generate') && response.request().method() === 'POST') {
      try {
        const data = await response.json()
        console.log(`[API] /generate response:`)
        console.log(`  imageUrl: ${data.imageUrl?.substring(0, 80)}...`)
        console.log(`  r2Path: ${data.r2Path}`)
      } catch {
        console.log(`[API] /generate completed (couldn't parse response)`)
      }
    }

    if (url.includes('/upload-to-r2') && response.request().method() === 'POST') {
      try {
        const data = await response.json()
        console.log(`[API] /upload-to-r2 response:`)
        console.log(`  r2Url: ${data.r2Url}`)
      } catch {
        console.log(`[API] /upload-to-r2 completed (couldn't parse response)`)
      }
    }
  })

  await page.goto(SITE_URL)

  console.log('Browser ready! Generate an image to test.\n')
  console.log('Watch for:')
  console.log('1. /generate returns FAL.ai URL + r2Path')
  console.log('2. Result page loads with FAL.ai image immediately')
  console.log('3. /upload-to-r2 called in background')
  console.log('4. QR code switches to R2 URL\n')
  console.log('-'.repeat(60))

  // Keep running
  process.on('SIGINT', () => {
    console.log('\nTest complete.')
    browser.close()
    process.exit(0)
  })

  await new Promise(() => {})
}

main().catch(console.error)
