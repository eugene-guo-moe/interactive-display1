import { chromium } from 'playwright'
import * as path from 'path'

async function checkCard() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } })
  const page = await context.newPage()

  // Capture the card upload URL
  let cardUrl = ''
  page.on('response', async response => {
    if (response.url().includes('upload-card') && response.status() === 200) {
      const data = await response.json()
      cardUrl = data.cardUrl || data.url || ''
      console.log('Card URL:', cardUrl)
    }
  })

  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log(`[LOG] ${msg.text().substring(0, 150)}`)
    }
  })

  const testUrl = 'https://interactive-display.pages.dev/result?testImage=https://v3b.fal.media/files/b/0a8b6019/VSMO8GMXP7nxhrXoJEJ6a.png&testProfile=builder'
  await page.goto(testUrl)

  // Wait for card to be ready
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    const ready = await page.locator('text=Scan to Download').isVisible().catch(() => false)
    if (ready) {
      console.log('Card ready!')
      break
    }
  }

  // Screenshot the final state
  await page.screenshot({ path: path.join(__dirname, 'card-check.png') })

  // Try to get the card image from the hidden element
  const cardDataUrl = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img')
    for (const img of imgs) {
      if (img.src.includes('cards/')) return img.src
    }
    // Check for the QR code container's card URL
    const qrContainer = document.querySelector('[data-card-url]')
    if (qrContainer) return qrContainer.getAttribute('data-card-url')
    return null
  })

  if (cardDataUrl) {
    console.log('Card data URL found:', cardDataUrl.substring(0, 100))
  }

  if (cardUrl) {
    console.log('\nDownloading card from:', cardUrl)
    const cardPage = await context.newPage()
    await cardPage.goto(cardUrl)
    await cardPage.screenshot({ path: path.join(__dirname, 'downloaded-card.png') })
    await cardPage.close()
  }

  await page.waitForTimeout(5000)
  await browser.close()
}

checkCard().catch(console.error)
