import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

async function testProductionResult() {
  console.log('=== Production Result Page Test ===\n')

  const outputDir = path.join(process.cwd(), 'scripts/production-test')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
  })
  const page = await context.newPage()

  // Log all console messages
  page.on('console', msg => {
    const text = msg.text()
    console.log(`   [CONSOLE ${msg.type()}] ${text.substring(0, 150)}`)
  })

  // Log network
  page.on('response', response => {
    const url = response.url()
    if (url.includes('upload-card') || url.includes('worker')) {
      console.log(`   [NETWORK] ${response.status()} ${url}`)
    }
  })

  try {
    // Test with test mode URL on production
    const testUrl = 'https://interactive-display.pages.dev/result?testImage=https://v3b.fal.media/files/b/0a8b6019/VSMO8GMXP7nxhrXoJEJ6a.png&testProfile=builder'

    console.log('1. Testing result page with test mode...')
    console.log(`   URL: ${testUrl}`)
    await page.goto(testUrl)
    await page.waitForTimeout(3000)

    // Check if we got redirected (test mode not deployed)
    const currentUrl = page.url()
    console.log(`2. Current URL: ${currentUrl}`)

    if (currentUrl !== testUrl && !currentUrl.includes('result')) {
      console.log('   Test mode not deployed to production - redirected away')
      console.log('   The production site needs to be redeployed with the new changes')
    }

    await page.screenshot({ path: path.join(outputDir, 'result-test-mode.png') })

    // Wait and check status
    console.log('3. Waiting for card generation...')
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000)

      const creating = await page.locator('text=Creating your card').isVisible().catch(() => false)
      const uploading = await page.locator('text=Uploading').isVisible().catch(() => false)
      const ready = await page.locator('text=Scan to Download').isVisible().catch(() => false)
      const error = await page.locator('text=generation failed').isVisible().catch(() => false)

      const status = creating ? 'creating' : uploading ? 'uploading' : ready ? 'ready' : error ? 'error' : 'unknown'
      if (i % 5 === 0) {
        console.log(`   Status at ${i}s: ${status}`)
      }

      if (ready || error) break
    }

    await page.screenshot({ path: path.join(outputDir, 'result-final.png') })

    console.log('\nBrowser staying open for 30 seconds...')
    await page.waitForTimeout(30000)

  } catch (err) {
    console.error('Test failed:', err)
    await page.screenshot({ path: path.join(outputDir, 'error.png') })
  } finally {
    await browser.close()
  }
}

testProductionResult().catch(console.error)
