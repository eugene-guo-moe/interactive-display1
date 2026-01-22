import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

async function testFullFlow() {
  console.log('=== Full Flow Test (Quiz -> Camera -> Result) ===\n')

  const outputDir = path.join(process.cwd(), 'scripts/full-flow-test')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    permissions: ['camera'],
  })
  const page = await context.newPage()

  // Log all console messages
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('Card') || text.includes('error') || text.includes('upload')) {
      console.log(`   [CONSOLE ${msg.type()}] ${text}`)
    }
  })

  // Log network for card upload
  page.on('response', response => {
    const url = response.url()
    if (url.includes('upload-card') || url.includes('generate')) {
      console.log(`   [NETWORK] ${response.status()} ${response.url().split('/').pop()}`)
    }
  })

  try {
    console.log('1. Home page...')
    await page.goto('http://localhost:3005')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(outputDir, '01-home.png') })

    console.log('2. Starting quiz...')
    await page.click('text=Begin Your Journey')
    await page.waitForTimeout(800)

    // Answer all 6 questions
    for (let q = 1; q <= 6; q++) {
      console.log(`3.${q}. Answering Q${q}...`)
      await page.waitForTimeout(500)
      // Click first option for each question
      const buttons = await page.locator('button').all()
      // Find the option buttons (not navigation)
      for (const btn of buttons) {
        const text = await btn.textContent()
        if (text && !text.includes('Begin') && !text.includes('Start') && !text.includes('Back')) {
          await btn.click()
          break
        }
      }
      await page.waitForTimeout(800)
    }

    await page.screenshot({ path: path.join(outputDir, '02-after-quiz.png') })

    // Check if we're on camera page
    const currentUrl = page.url()
    console.log(`4. Current URL: ${currentUrl}`)

    if (currentUrl.includes('camera')) {
      console.log('5. On camera page - need to capture photo')
      await page.screenshot({ path: path.join(outputDir, '03-camera.png') })

      // The camera page needs actual camera or we need to mock it
      // For now, let's check if there's a way to skip or inject

      console.log('\n=== Camera requires real device or mock ===')
      console.log('The full flow test reached the camera page successfully.')
      console.log('To test card generation, use the test mode URL:')
      console.log('http://localhost:3005/result?testImage=https://v3b.fal.media/files/b/0a8b6019/VSMO8GMXP7nxhrXoJEJ6a.png&testProfile=builder')
    }

    console.log('\nBrowser staying open for 30 seconds...')
    await page.waitForTimeout(30000)

  } catch (err) {
    console.error('Test failed:', err)
    await page.screenshot({ path: path.join(outputDir, 'error.png') })
  } finally {
    await browser.close()
  }
}

testFullFlow().catch(console.error)
