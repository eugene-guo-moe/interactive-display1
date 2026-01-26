import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

async function testProduction() {
  console.log('=== Production Flow Test (interactive-display.pages.dev) ===\n')

  const outputDir = path.join(process.cwd(), 'scripts/production-test')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Launch with fake media devices
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--use-file-for-fake-video-capture=' + path.join(process.cwd(), 'public/test-face.mjpeg'),
    ]
  })

  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    permissions: ['camera'],
  })

  const page = await context.newPage()

  // Log all console messages
  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'error' ||
        text.includes('Card') ||
        text.includes('card') ||
        text.includes('generation') ||
        text.includes('upload') ||
        text.includes('Error') ||
        text.includes('error')) {
      console.log(`   [CONSOLE ${msg.type()}] ${text.substring(0, 200)}`)
    }
  })

  // Log network requests
  page.on('response', response => {
    const url = response.url()
    if (url.includes('upload-card') || url.includes('generate') || url.includes('fal.media')) {
      console.log(`   [NETWORK] ${response.status()} ${url.substring(0, 80)}...`)
    }
  })

  try {
    console.log('1. Loading production site...')
    await page.goto('https://interactive-display.pages.dev')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(outputDir, '01-home.png') })
    console.log('   Screenshot: 01-home.png')

    console.log('2. Starting quiz...')
    await page.click('text=Begin Your Journey')
    await page.waitForTimeout(1000)

    // Answer all 6 questions (click first option each time)
    for (let q = 1; q <= 6; q++) {
      console.log(`3.${q}. Answering Q${q}...`)
      await page.waitForTimeout(500)

      // Find and click an answer button
      const buttons = await page.locator('button').all()
      for (const btn of buttons) {
        const text = await btn.textContent()
        // Skip navigation buttons, look for answer options
        if (text && text.length > 10 && text.length < 200 &&
            !text.includes('Begin') && !text.includes('Journey')) {
          await btn.click()
          break
        }
      }
      await page.waitForTimeout(800)
    }

    await page.screenshot({ path: path.join(outputDir, '02-after-quiz.png') })
    console.log('   Screenshot: 02-after-quiz.png')

    // Should be on camera page now
    const url = page.url()
    console.log(`4. Current URL: ${url}`)

    if (url.includes('camera')) {
      console.log('5. On camera page...')
      await page.screenshot({ path: path.join(outputDir, '03-camera.png') })

      // Wait for camera to initialize
      await page.waitForTimeout(2000)

      // Look for capture button and click it
      console.log('6. Looking for capture button...')
      const captureBtn = page.locator('button').filter({ hasText: /take|capture|photo/i }).first()
      if (await captureBtn.isVisible()) {
        console.log('   Found capture button, clicking...')
        await captureBtn.click()
      } else {
        // Try clicking any prominent button
        const anyBtn = page.locator('button:visible').first()
        console.log('   Clicking first visible button...')
        await anyBtn.click()
      }

      await page.waitForTimeout(1000)
      await page.screenshot({ path: path.join(outputDir, '04-after-capture.png') })
    }

    // Check if we're on loading page
    console.log('7. Checking for loading page...')
    await page.waitForTimeout(2000)
    const loadingUrl = page.url()
    console.log(`   URL: ${loadingUrl}`)
    await page.screenshot({ path: path.join(outputDir, '05-loading-or-next.png') })

    if (loadingUrl.includes('loading')) {
      console.log('8. On loading page, waiting for generation...')

      // Wait for result page (up to 2 minutes)
      for (let i = 0; i < 120; i++) {
        await page.waitForTimeout(1000)
        const currentUrl = page.url()

        if (i % 10 === 0) {
          console.log(`   Waiting... ${i}s (URL: ${currentUrl})`)
          await page.screenshot({ path: path.join(outputDir, `06-loading-${i}s.png`) })
        }

        if (currentUrl.includes('result')) {
          console.log(`   Reached result page after ${i} seconds`)
          break
        }
      }
    }

    // Check result page
    const finalUrl = page.url()
    console.log(`9. Final URL: ${finalUrl}`)
    await page.screenshot({ path: path.join(outputDir, '07-result.png') })

    if (finalUrl.includes('result')) {
      console.log('10. On result page, checking card generation...')

      // Wait and monitor card status
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(1000)

        const creating = await page.locator('text=Creating your card').isVisible().catch(() => false)
        const uploading = await page.locator('text=Uploading').isVisible().catch(() => false)
        const ready = await page.locator('text=Scan to Download').isVisible().catch(() => false)
        const error = await page.locator('text=generation failed').isVisible().catch(() => false)

        const status = creating ? 'creating' : uploading ? 'uploading' : ready ? 'ready' : error ? 'error' : 'loading'
        console.log(`   Card status: ${status} (${i}s)`)

        if (ready || error) {
          await page.screenshot({ path: path.join(outputDir, '08-final-result.png') })
          console.log(`   Final status: ${status}`)
          break
        }

        if (i % 10 === 0) {
          await page.screenshot({ path: path.join(outputDir, `07-result-${i}s.png`) })
        }
      }
    } else {
      console.log('   Not on result page, something went wrong')
    }

    console.log('\n=== Test Complete ===')
    console.log(`Screenshots saved to: ${outputDir}`)
    console.log('\nBrowser staying open for 60 seconds for inspection...')
    await page.waitForTimeout(60000)

  } catch (err) {
    console.error('Test failed:', err)
    await page.screenshot({ path: path.join(outputDir, 'error.png') })
  } finally {
    await browser.close()
  }
}

testProduction().catch(console.error)
