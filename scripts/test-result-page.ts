import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

// Test images from previous FAL.ai generations
const testImages = [
  'https://v3b.fal.media/files/b/0a8b6019/VSMO8GMXP7nxhrXoJEJ6a.png',
  'https://v3b.fal.media/files/b/0a8b601a/zeUa63VI3LQBbsXfDPWvt.png',
  'https://v3b.fal.media/files/b/0a8b601b/tx5bYSfl10kEBQpCn32ng.png'
]

const profiles = ['guardian', 'builder', 'shaper']

async function testResultPage() {
  console.log('=== Result Page Card Generation Test ===\n')

  const outputDir = path.join(process.cwd(), 'scripts/result-test')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
  })
  const page = await context.newPage()

  // Log network requests for card upload
  page.on('response', response => {
    const url = response.url()
    if (url.includes('upload-card')) {
      console.log(`   [NETWORK] ${response.status()} POST /upload-card`)
    }
  })

  // Log all relevant console messages
  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'error' ||
        text.includes('Card') ||
        text.includes('card') ||
        text.includes('Base64') ||
        text.includes('base64') ||
        text.includes('upload') ||
        text.includes('generation') ||
        text.includes('Converting')) {
      console.log(`   [CONSOLE ${msg.type()}] ${text}`)
    }
  })

  try {
    for (let i = 0; i < testImages.length; i++) {
      const imageUrl = testImages[i]
      const profile = profiles[i]

      console.log(`\n--- Test ${i + 1}/3: ${profile} profile ---`)

      // Use test mode URL params
      const testUrl = `http://localhost:3005/result?testImage=${encodeURIComponent(imageUrl)}&testProfile=${profile}`
      console.log('1. Navigating to result page in test mode...')
      await page.goto(testUrl)
      await page.waitForTimeout(1000)

      // Screenshot initial state
      await page.screenshot({ path: path.join(outputDir, `${i + 1}-${profile}-initial.png`) })
      console.log(`   Screenshot: ${i + 1}-${profile}-initial.png`)

      // Wait for image to load
      console.log('2. Waiting for image to load...')
      await page.waitForSelector('img[alt="Your Singapore moment"]', { timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(2000)

      // Screenshot after image loads
      await page.screenshot({ path: path.join(outputDir, `${i + 1}-${profile}-image-loaded.png`) })
      console.log(`   Screenshot: ${i + 1}-${profile}-image-loaded.png`)

      // Wait for card generation
      console.log('3. Waiting for card generation...')
      let lastStatus = ''
      for (let j = 0; j < 60; j++) {
        await page.waitForTimeout(1000)

        const creating = await page.locator('text=Creating your card').isVisible().catch(() => false)
        const uploading = await page.locator('text=Uploading').isVisible().catch(() => false)
        const ready = await page.locator('text=Scan to Download').isVisible().catch(() => false)
        const error = await page.locator('text=generation failed').isVisible().catch(() => false)

        const status = creating ? 'creating' : uploading ? 'uploading' : ready ? 'ready' : error ? 'error' : 'loading'
        if (status !== lastStatus) {
          console.log(`   Status: ${status}`)
          lastStatus = status
        }

        if (ready || error) break
      }

      // Final screenshot
      await page.screenshot({ path: path.join(outputDir, `${i + 1}-${profile}-final.png`) })
      console.log(`   Screenshot: ${i + 1}-${profile}-final.png`)

      // Check if QR code is visible
      const qrVisible = await page.locator('text=Scan to Download').isVisible().catch(() => false)
      if (qrVisible) {
        console.log('   Card generation successful!')
      } else {
        console.log('   Card generation may have failed')
      }
    }

    console.log('\n=== All Tests Complete ===')
    console.log(`Screenshots saved to: ${outputDir}`)
    console.log('\nBrowser will stay open for 30 seconds...')
    await page.waitForTimeout(30000)

  } catch (err) {
    console.error('Test failed:', err)
    await page.screenshot({ path: path.join(outputDir, 'error.png') })
  } finally {
    await browser.close()
  }
}

testResultPage().catch(console.error)
