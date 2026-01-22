import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const testImages = [
  'https://v3b.fal.media/files/b/0a8b6019/VSMO8GMXP7nxhrXoJEJ6a.png',
  'https://v3b.fal.media/files/b/0a8b601a/zeUa63VI3LQBbsXfDPWvt.png',
  'https://v3b.fal.media/files/b/0a8b601b/tx5bYSfl10kEBQpCn32ng.png'
]

async function testCardGeneration() {
  console.log('=== Card Generation Test (using Playwright screenshot) ===\n')

  const outputDir = path.join(process.cwd(), 'scripts/api-test-results')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 600, height: 1000 },
  })
  const page = await context.newPage()

  for (let i = 0; i < testImages.length; i++) {
    const imageUrl = testImages[i]
    console.log(`Generating card ${i + 1}/3...`)

    // Create a standalone HTML page for the card
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #0a0a0a; }
        </style>
      </head>
      <body>
        <div id="card" style="
          width: 540px;
          height: 960px;
          background-color: #0a0a0a;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 24px;
          ">
            <!-- School logo -->
            <div style="text-align: center; margin-bottom: 16px;">
              <img
                src="http://localhost:3004/school-logo.png"
                alt="Riverside Secondary School"
                style="height: 60px; margin: 0 auto;"
              />
            </div>

            <!-- Generated image -->
            <div style="
              flex: 0 0 auto;
              border-radius: 16px;
              overflow: hidden;
              border: 3px solid #10B981;
              box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
              max-height: 450px;
            ">
              <img
                src="${imageUrl}"
                alt="Your Singapore moment"
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
              />
            </div>

            <!-- Profile info -->
            <div style="
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: center;
              padding: 20px 0;
            ">
              <div style="font-size: 48px; margin-bottom: 8px;">🤝</div>
              <h2 style="
                font-size: 28px;
                font-weight: 700;
                color: #10B981;
                margin: 0 0 8px 0;
                text-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
              ">
                The Community Builder
              </h2>
              <p style="
                font-size: 16px;
                color: rgba(255,255,255,0.7);
                font-style: italic;
                margin: 0 0 16px 0;
                padding: 0 16px;
              ">
                "You believe Singapore thrives when we strengthen our bonds."
              </p>

              <p style="
                font-size: 14px;
                color: rgba(255,255,255,0.6);
                line-height: 1.6;
                margin: 0 0 12px 0;
                padding: 0 8px;
              ">
                You see Singapore's greatest asset in its people. You value the gotong royong spirit that helped build our nation and believe strong communities are the foundation of our success.
              </p>

              <p style="
                font-size: 14px;
                font-weight: 600;
                color: #10B981;
                margin: 0;
                padding: 0 8px;
              ">
                Your strength: You strengthen the social fabric that holds Singapore together.
              </p>
            </div>

            <!-- Footer -->
            <div style="
              text-align: center;
              border-top: 1px solid rgba(16, 185, 129, 0.3);
              padding-top: 16px;
            ">
              <p style="font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 1px; margin: 0;">
                RIVERSIDE SECONDARY SCHOOL, SINGAPORE
              </p>
              <p style="font-size: 10px; color: rgba(255,255,255,0.3); margin: 4px 0 0 0;">
                Powered by AI
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `)

    // Wait for images to load
    await page.waitForTimeout(2000)

    // Screenshot the card element
    const card = await page.$('#card')
    if (card) {
      const outputPath = path.join(outputDir, `card-${i + 1}.png`)
      await card.screenshot({ path: outputPath })
      const stats = fs.statSync(outputPath)
      console.log(`  Saved: card-${i + 1}.png (${Math.round(stats.size / 1024)} KB)`)
    }
  }

  console.log('\nDone! Cards saved to: scripts/api-test-results/')
  await browser.close()
}

testCardGeneration().catch(console.error)
