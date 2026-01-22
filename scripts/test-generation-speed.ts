import { chromium, devices } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004'
const NUM_TESTS = 3

async function testGenerationSpeed() {
  console.log('=== Image Generation Speed Test ===')
  console.log(`Testing ${NUM_TESTS} generations at ${BASE_URL}\n`)

  const downloadPath = path.join(process.cwd(), 'scripts', 'speed-test-results')

  // Create results directory
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true })
  }

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  })

  const results: { test: number; totalTime: number; downloadSize: number; success: boolean }[] = []

  for (let testNum = 1; testNum <= NUM_TESTS; testNum++) {
    console.log(`\n--- Test ${testNum}/${NUM_TESTS} ---`)

    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      permissions: ['camera'],
    })
    const page = await context.newPage()

    const testStart = Date.now()
    let success = false
    let downloadSize = 0

    try {
      // 1. Navigate to homepage and start quiz
      console.log('1. Starting quiz...')
      await page.goto(BASE_URL)
      await page.waitForTimeout(500)
      await page.click('button:has-text("Begin Your Journey")')

      // 2. Answer all 6 questions (always pick option A for consistency)
      const quizStart = Date.now()
      for (let i = 1; i <= 6; i++) {
        await page.waitForSelector('button[class*="backdrop-blur"][class*="opacity-100"]', { timeout: 10000 })
        await page.click('button[class*="backdrop-blur"][class*="opacity-100"]:first-of-type')
        await page.waitForTimeout(800)
      }
      console.log(`   Quiz completed in ${((Date.now() - quizStart) / 1000).toFixed(1)}s`)

      // 3. Camera page - capture photo
      await page.waitForURL('**/camera', { timeout: 10000 })
      await page.waitForTimeout(2000) // Wait for camera to initialize

      const captureButton = await page.$('button.btn-press:has(div.rounded-full)')
      if (captureButton) {
        await captureButton.click()
        await page.waitForTimeout(4000) // Wait for countdown + capture

        const usePhotoButton = await page.$('button.w-20.h-20.bg-white')
        if (usePhotoButton) {
          await usePhotoButton.click()
        }
      }

      // 4. Loading page - wait for generation
      await page.waitForURL('**/loading', { timeout: 10000 })
      const generationStart = Date.now()
      console.log('2. Image generation started...')

      // Wait for result page (up to 3 minutes)
      await page.waitForURL('**/result', { timeout: 180000 })
      const generationTime = (Date.now() - generationStart) / 1000
      console.log(`   Generation completed in ${generationTime.toFixed(1)}s`)

      // 5. Download the card
      await page.waitForTimeout(3000) // Wait for card to render

      const downloadButton = await page.$('button:has-text("Download")')
      if (downloadButton) {
        console.log('3. Downloading card...')

        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }),
          downloadButton.click(),
        ])

        const downloadedPath = path.join(downloadPath, `test-${testNum}-card.png`)
        await download.saveAs(downloadedPath)

        const stats = fs.statSync(downloadedPath)
        downloadSize = stats.size
        console.log(`   Downloaded: ${downloadedPath} (${(downloadSize / 1024).toFixed(1)} KB)`)

        // Also save a screenshot of the result page
        await page.screenshot({ path: path.join(downloadPath, `test-${testNum}-result.png`) })

        success = true
      }

      const totalTime = (Date.now() - testStart) / 1000
      results.push({ test: testNum, totalTime, downloadSize, success })
      console.log(`   Total time: ${totalTime.toFixed(1)}s`)

    } catch (error: any) {
      console.error(`   Error: ${error.message}`)
      await page.screenshot({ path: path.join(downloadPath, `test-${testNum}-error.png`) })
      results.push({ test: testNum, totalTime: 0, downloadSize: 0, success: false })
    } finally {
      await context.close()
    }
  }

  await browser.close()

  // Print summary
  console.log('\n=== Results Summary ===')
  console.log('Test | Time (s) | Card Size (KB) | Status')
  console.log('-----|----------|----------------|-------')

  results.forEach(r => {
    const time = r.success ? r.totalTime.toFixed(1).padStart(8) : '    N/A '
    const size = r.success ? (r.downloadSize / 1024).toFixed(1).padStart(14) : '           N/A '
    const status = r.success ? 'Pass' : 'FAIL'
    console.log(`  ${r.test}  |${time} |${size} | ${status}`)
  })

  const successfulTests = results.filter(r => r.success)
  if (successfulTests.length > 0) {
    const avgTime = successfulTests.reduce((sum, r) => sum + r.totalTime, 0) / successfulTests.length
    const avgSize = successfulTests.reduce((sum, r) => sum + r.downloadSize, 0) / successfulTests.length
    console.log('-----|----------|----------------|-------')
    console.log(` Avg |${avgTime.toFixed(1).padStart(8)} |${(avgSize / 1024).toFixed(1).padStart(14)} |`)
  }

  console.log(`\nResults saved to: ${downloadPath}`)
}

testGenerationSpeed().catch(console.error)
