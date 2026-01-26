import { chromium } from 'playwright'
import * as path from 'path'

const profiles = ['guardian', 'builder', 'shaper', 'guardian-builder', 'builder-shaper', 'adaptive-guardian']

async function checkAllCards() {
  const browser = await chromium.launch({ headless: true })

  for (const profile of profiles) {
    console.log(`\n--- Generating card for: ${profile} ---`)
    const context = await browser.newContext({ viewport: { width: 430, height: 932 } })
    const page = await context.newPage()

    let cardUrl = ''
    page.on('response', async response => {
      if (response.url().includes('upload-card') && response.status() === 200) {
        const data = await response.json()
        cardUrl = data.cardUrl || data.url || ''
        console.log('Card URL:', cardUrl)
      }
    })

    const testUrl = `https://interactive-display.pages.dev/result?testImage=https://v3b.fal.media/files/b/0a8b6019/VSMO8GMXP7nxhrXoJEJ6a.png&testProfile=${profile}`
    await page.goto(testUrl)

    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000)
      const ready = await page.locator('text=Scan to Download').isVisible().catch(() => false)
      if (ready) {
        console.log('Card ready!')
        break
      }
    }

    if (cardUrl) {
      console.log('Downloading card:', profile)
      const cardPage = await context.newPage()
      await cardPage.goto(cardUrl)
      await cardPage.screenshot({ path: path.join(__dirname, `card-${profile}.png`) })
      await cardPage.close()
    } else {
      console.log('No card URL captured for', profile)
    }

    await context.close()
  }

  await browser.close()
  console.log('\nAll cards generated!')
}

checkAllCards().catch(console.error)
