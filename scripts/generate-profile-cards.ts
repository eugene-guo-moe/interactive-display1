import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Random Unsplash images (portrait-style)
const unsplashImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', // Professional man
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80', // Professional woman
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80', // Casual man
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80', // Casual woman
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80', // Young professional
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80', // Young woman
];

const profileTypes = [
  'guardian',
  'steward',
  'shaper',
  'guardian-steward',
  'steward-shaper',
  'adaptive-guardian',
];

async function generateProfileCards() {
  const outputDir = path.join(process.cwd(), 'generated-cards');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 600, height: 1000 },
  });

  for (let i = 0; i < profileTypes.length; i++) {
    const profile = profileTypes[i];
    const image = unsplashImages[i];

    console.log(`\nGenerating card for: ${profile}`);
    console.log(`Using image: ${image}`);

    const page = await context.newPage();

    // Navigate to result page with test params
    const url = `http://localhost:3000/result?testImage=${encodeURIComponent(image)}&testProfile=${profile}`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for the main image to load using evaluate
    try {
      // Wait for the img to have loaded (naturalWidth > 0)
      await page.waitForFunction(() => {
        const img = document.querySelector('img[alt="Your Singapore moment"]') as HTMLImageElement;
        return img && img.complete && img.naturalWidth > 0;
      }, { timeout: 30000 });

      console.log(`Image element loaded for ${profile}`);

      // Now wait for React to update - look for the "AI Generated" badge
      await page.waitForSelector('text=AI Generated', { timeout: 10000 });
      console.log(`Badge visible for ${profile}`);

      // Wait a bit more for any animations
      await page.waitForTimeout(1000);

      // Take a screenshot
      const screenshotPath = path.join(outputDir, `${profile}-card.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);

    } catch (error) {
      console.log(`Error for ${profile}: ${error}`);
      // Wait and take screenshot anyway
      await page.waitForTimeout(3000);
      const screenshotPath = path.join(outputDir, `${profile}-card-error.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Error screenshot saved: ${screenshotPath}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n✅ Done! Cards saved to: ${outputDir}`);
}

generateProfileCards().catch(console.error);
