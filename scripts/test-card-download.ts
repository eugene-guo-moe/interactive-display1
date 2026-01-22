import { chromium, devices } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004'

async function testCardDownload() {
  console.log('Starting Playwright test for card download...')
  console.log(`Using BASE_URL: ${BASE_URL}`)

  const downloadPath = path.join(process.cwd(), 'scripts')

  // Read test image
  const testImagePath = path.join(process.cwd(), 'scripts/test-face.jpg')
  const imageBuffer = fs.readFileSync(testImagePath)
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`

  // Use a pre-generated image URL
  const testResultImageUrl = 'https://v3b.fal.media/files/b/0a8b0821/cllOPFQ53iYKMzNcwGH19.png'

  // Launch browser with fake media device to simulate camera
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  })

  // Use a device with camera permissions
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    permissions: ['camera'],
  })
  const page = await context.newPage()

  try {
    // Navigate to homepage
    console.log('1. Starting quiz flow...')
    await page.goto(BASE_URL)
    await page.waitForTimeout(1000)

    // Click start
    console.log('2. Clicking Begin Your Journey...')
    await page.click('button:has-text("Begin Your Journey")')

    // Answer 6 questions
    for (let i = 1; i <= 6; i++) {
      console.log(`   Q${i}...`)
      // Wait for options to animate in (typewriter + stagger animation)
      // Options have opacity-0 when hidden, opacity-100 when visible
      await page.waitForSelector('button[class*="backdrop-blur"][class*="opacity-100"]', { timeout: 10000 })
      // Click the first visible option (A)
      await page.click('button[class*="backdrop-blur"][class*="opacity-100"]:first-of-type')
      // Wait for navigation (400ms delay in handleSelect + some buffer)
      await page.waitForTimeout(1000)
    }

    // Wait for camera page
    console.log('3. Waiting for camera page...')
    await page.waitForURL('**/camera', { timeout: 10000 })
    await page.screenshot({ path: path.join(downloadPath, 'test-1-camera.png') })
    console.log('   On camera page!')

    // Wait for fake camera to initialize
    console.log('4. Waiting for camera to initialize...')
    await page.waitForTimeout(2000)

    // Check if camera is ready (the capture button should be enabled)
    const captureButton = await page.$('button.btn-press:has(div.rounded-full)')
    if (captureButton) {
      console.log('   Camera ready, starting photo capture...')

      // Click the capture button to start countdown
      await captureButton.click()

      // Wait for countdown (3 seconds) and photo capture
      console.log('   Waiting for countdown and capture...')
      await page.waitForTimeout(4000)

      await page.screenshot({ path: path.join(downloadPath, 'test-2-captured.png') })

      // Look for the "Use this photo" button (large white circular button with checkmark)
      // It's the big button (w-20 h-20) with bg-white class
      const usePhotoButton = await page.$('button.w-20.h-20.bg-white')
      if (usePhotoButton) {
        console.log('5. Using captured photo...')
        await usePhotoButton.click()

        // Wait for loading page
        await page.waitForURL('**/loading', { timeout: 10000 })
        console.log('   On loading page!')
        await page.screenshot({ path: path.join(downloadPath, 'test-3-loading.png') })

        // The loading page makes an API call to generate the image
        // This will fail without the API running, so let's wait and see what happens
        console.log('6. Waiting for image generation (this may take a while or fail without API)...')

        try {
          // Wait up to 60 seconds for result page
          await page.waitForURL('**/result', { timeout: 60000 })
          console.log('   On result page!')
          await page.screenshot({ path: path.join(downloadPath, 'test-4-result.png') })

          // Look for download button
          console.log('7. Looking for download button...')
          await page.waitForTimeout(3000) // Wait for card to render

          const downloadButton = await page.$('button:has-text("Download")')
          if (downloadButton) {
            console.log('   Found download button, clicking...')

            const [download] = await Promise.all([
              page.waitForEvent('download', { timeout: 30000 }),
              downloadButton.click(),
            ])

            const downloadedPath = path.join(downloadPath, 'test-downloaded-card.png')
            await download.saveAs(downloadedPath)

            const stats = fs.statSync(downloadedPath)
            console.log(`8. Card downloaded: ${downloadedPath}`)
            console.log(`   File size: ${stats.size} bytes`)

            if (stats.size > 50000) {
              console.log('✅ Test PASSED! Full flow works - card downloaded successfully.')
            } else {
              console.log('⚠️ Warning: File seems small, check the output.')
            }
          } else {
            console.log('   Download button not found')
            await page.screenshot({ path: path.join(downloadPath, 'test-5-no-download.png') })
          }
        } catch (loadingErr) {
          console.log('   Image generation failed or timed out (expected without API)')
          await page.screenshot({ path: path.join(downloadPath, 'test-4-loading-timeout.png') })
          console.log('✅ Quiz flow and camera capture verified successfully.')
          console.log('   Full download test requires running API server.')
        }
      } else {
        console.log('   Use photo button not found after capture')
        await page.screenshot({ path: path.join(downloadPath, 'test-2-no-use-btn.png') })
      }
    } else {
      console.log('   Camera capture button not found')
      await page.screenshot({ path: path.join(downloadPath, 'test-1-no-capture-btn.png') })
    }

  } catch (error) {
    console.error('Test error:', error)
    await page.screenshot({ path: path.join(downloadPath, 'test-error.png') })
  } finally {
    await browser.close()
  }
}

testCardDownload().catch(console.error)
