import { chromium } from 'playwright'

const BASE_URL = 'https://riversidesec.pages.dev'

async function testResultPage() {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('[PAGE]', msg.text())
    }
  })

  // Track network requests to see R2 polling
  page.on('request', request => {
    const url = request.url()
    if (url.includes('r2.') || url.includes('HEAD')) {
      console.log('[NETWORK]', request.method(), url)
    }
  })

  page.on('response', response => {
    const url = response.url()
    if (url.includes('r2.') || url.includes('riversidesec.eugene')) {
      console.log('[RESPONSE]', response.status(), url)
    }
  })

  try {
    // Step 1: Go to home page
    console.log('\n=== Step 1: Home Page ===')
    await page.goto(BASE_URL)
    await page.waitForTimeout(1000)

    // Click start button
    await page.click('text=Begin Your Journey')
    await page.waitForTimeout(500)

    // Step 2: Answer Question 1
    console.log('\n=== Step 2: Question 1 ===')
    await page.waitForSelector('text=What aspect of Singapore')
    await page.waitForTimeout(2000) // Wait for animation
    await page.click('button:has-text("Kampung spirit")')
    await page.waitForTimeout(500)

    // Step 3: Answer Question 2
    console.log('\n=== Step 3: Question 2 ===')
    await page.waitForSelector('text=Which Singapore icon')
    await page.waitForTimeout(2000)
    await page.click('button:has-text("Merlion")')
    await page.waitForTimeout(500)

    // Step 4: Answer Question 3
    console.log('\n=== Step 4: Question 3 ===')
    await page.waitForSelector('text=Where does your heart')
    await page.waitForTimeout(2000)
    await page.click('button:has-text("Looking back")')
    await page.waitForTimeout(500)

    // Step 5: Camera page - we'll need to provide a test image
    console.log('\n=== Step 5: Camera Page ===')
    await page.waitForSelector('text=Position yourself')

    // The camera page has a file input hidden - let's check if we can use it
    // Or we need to interact with the camera
    console.log('Camera page loaded. Need to capture/upload a photo.')
    console.log('This test requires manual interaction or mocking.')

    // For now, let's just verify we got to the camera page
    const cameraUrl = page.url()
    console.log('Current URL:', cameraUrl)

    if (cameraUrl.includes('/camera')) {
      console.log('✓ Successfully navigated through questions to camera page')
    }

    // Keep browser open for manual testing
    console.log('\n=== Manual Testing ===')
    console.log('Browser is open. You can:')
    console.log('1. Take a photo manually')
    console.log('2. Wait for generation')
    console.log('3. Check the result page')
    console.log('\nWatching for R2 polling requests...')
    console.log('Press Ctrl+C to close.\n')

    // Keep alive for manual interaction
    await page.waitForTimeout(300000) // 5 minutes

  } catch (error) {
    console.error('Test error:', error)
  } finally {
    await browser.close()
  }
}

testResultPage()
