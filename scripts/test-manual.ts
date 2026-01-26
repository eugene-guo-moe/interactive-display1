import { chromium } from 'playwright'

const BASE_URL = 'https://interactive-display.pages.dev'

async function testManual() {
  console.log('Launching browser...')
  console.log('This test opens the site and monitors network requests.')
  console.log('You need to manually complete the flow.\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    permissions: ['camera'],
  })
  const page = await context.newPage()

  // Track all FAL.ai and R2 related requests
  const requests: { time: string; type: string; url: string; status?: number }[] = []

  page.on('request', request => {
    const url = request.url()
    if (url.includes('fal.media') || url.includes('fal.ai') ||
        url.includes('r2.dev') || url.includes('riversidesec.eugene')) {
      const entry = {
        time: new Date().toISOString().split('T')[1].split('.')[0],
        type: request.method(),
        url: url.substring(0, 80) + (url.length > 80 ? '...' : ''),
      }
      requests.push(entry)
      console.log(`[${entry.time}] ${entry.type} ${entry.url}`)
    }
  })

  page.on('response', response => {
    const url = response.url()
    if (url.includes('fal.media') || url.includes('fal.ai') ||
        url.includes('r2.dev') || url.includes('riversidesec.eugene')) {
      console.log(`[RESPONSE] ${response.status()} ${url.substring(0, 60)}...`)
    }
  })

  // Log console messages for debugging
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('R2') || text.includes('FAL') || text.includes('URL') ||
        text.includes('Download') || text.includes('switching') || text.includes('fallback')) {
      console.log(`[CONSOLE] ${text}`)
    }
  })

  // Monitor URL changes
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`\n>>> Navigated to: ${frame.url()}\n`)
    }
  })

  try {
    await page.goto(BASE_URL)

    console.log('\n========================================')
    console.log('Browser is open at', BASE_URL)
    console.log('========================================')
    console.log('\nPlease manually:')
    console.log('1. Click "Begin Your Journey"')
    console.log('2. Answer all 3 questions')
    console.log('3. Take a photo')
    console.log('4. Wait for generation')
    console.log('5. Observe the result page\n')
    console.log('Monitoring network requests for FAL.ai and R2...')
    console.log('Look for HEAD requests to R2 (polling)')
    console.log('Look for the image URL switch\n')
    console.log('Press Ctrl+C when done.\n')

    // Wait for result page and then monitor
    await page.waitForURL('**/result', { timeout: 300000 })

    console.log('\n========================================')
    console.log('RESULT PAGE REACHED!')
    console.log('========================================\n')

    // Get the QR code value
    const qrValue = await page.evaluate(() => {
      const svg = document.querySelector('svg[class*="QR"]') || document.querySelector('.bg-white svg')
      // Try to find the QR code's value from the page state
      return (window as any).__NEXT_DATA__?.props?.pageProps || 'Could not extract'
    })
    console.log('QR Code context:', qrValue)

    // Monitor for 60 seconds to see R2 polling
    console.log('\nMonitoring for 60 seconds to observe R2 polling...\n')

    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000)
      console.log(`... ${(i + 1) * 5} seconds elapsed, ${requests.length} relevant requests so far`)
    }

    console.log('\n========================================')
    console.log('SUMMARY')
    console.log('========================================')
    console.log(`Total relevant requests: ${requests.length}`)

    const headRequests = requests.filter(r => r.type === 'HEAD')
    const getRequests = requests.filter(r => r.type === 'GET')

    console.log(`HEAD requests (R2 polling): ${headRequests.length}`)
    console.log(`GET requests (image loading): ${getRequests.length}`)

    if (headRequests.length > 0) {
      console.log('\nHEAD requests (R2 polling):')
      headRequests.forEach(r => console.log(`  ${r.time} ${r.url}`))
    }

  } catch (error) {
    if ((error as Error).message.includes('timeout')) {
      console.log('\nTimeout waiting for result page.')
      console.log('The browser will stay open for manual testing.')
      await page.waitForTimeout(300000)
    } else {
      console.error('Test error:', error)
    }
  } finally {
    await browser.close()
  }
}

testManual()
