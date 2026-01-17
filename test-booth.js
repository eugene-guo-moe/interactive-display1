const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🚀 Testing History vs Future Booth...\n');

  // Test 1: Welcome Page
  console.log('1️⃣ Testing Welcome Page...');
  await page.goto('https://history-vs-future.pages.dev');
  await page.waitForLoadState('networkidle');

  const title = await page.title();
  console.log(`   Title: ${title}`);

  const startButton = await page.locator('button:has-text("Start Experience")');
  console.log(`   Start Button visible: ${await startButton.isVisible() ? '✅' : '❌'}`);

  // Test 2: Question 1
  console.log('\n2️⃣ Testing Question 1...');
  await page.goto('https://history-vs-future.pages.dev/question/1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for hydration

  const q1Visible = await page.locator('text=Singapore resonates').isVisible().catch(() => false);
  const q1Options = await page.locator('text=Kampung spirit').isVisible().catch(() => false);
  console.log(`   Question text: ${q1Visible ? '✅' : '❌'}`);
  console.log(`   Options visible: ${q1Options ? '✅' : '❌'}`);

  // Test 3: Question 2
  console.log('\n3️⃣ Testing Question 2...');
  await page.goto('https://history-vs-future.pages.dev/question/2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const q2Visible = await page.locator('text=Singapore icon').isVisible().catch(() => false);
  const q2Options = await page.locator('text=Marina Bay Sands').isVisible().catch(() => false);
  console.log(`   Question text: ${q2Visible ? '✅' : '❌'}`);
  console.log(`   Options visible: ${q2Options ? '✅' : '❌'}`);

  // Test 4: Question 3
  console.log('\n4️⃣ Testing Question 3...');
  await page.goto('https://history-vs-future.pages.dev/question/3');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const q3Visible = await page.locator('text=heart lean').isVisible().catch(() => false);
  const q3Options = await page.locator('text=Looking forward').isVisible().catch(() => false);
  console.log(`   Question text: ${q3Visible ? '✅' : '❌'}`);
  console.log(`   Options visible: ${q3Options ? '✅' : '❌'}`);

  // Test 5: Full flow simulation
  console.log('\n5️⃣ Testing full navigation flow...');
  await page.goto('https://history-vs-future.pages.dev');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click start
  await page.click('button:has-text("Start Experience")');
  await page.waitForTimeout(2000);
  console.log(`   After Start: ${page.url().includes('question/1') ? '✅ Q1' : '❌'}`);

  // Select Q1 answer and next
  await page.click('text=Kampung spirit').catch(() => {});
  await page.waitForTimeout(500);
  await page.click('button:has-text("Next")').catch(() => {});
  await page.waitForTimeout(2000);
  console.log(`   After Q1: ${page.url().includes('question/2') ? '✅ Q2' : '❌'}`);

  // Select Q2 answer and next
  await page.click('text=Marina Bay Sands').catch(() => {});
  await page.waitForTimeout(500);
  await page.click('button:has-text("Next")').catch(() => {});
  await page.waitForTimeout(2000);
  console.log(`   After Q2: ${page.url().includes('question/3') ? '✅ Q3' : '❌'}`);

  // Select Q3 answer and next
  await page.click('text=Looking forward').catch(() => {});
  await page.waitForTimeout(500);
  await page.click('button:has-text("Take Photo")').catch(() => {});
  await page.waitForTimeout(2000);
  console.log(`   After Q3: ${page.url().includes('camera') ? '✅ Camera' : '❌'}`);

  console.log('\n✨ All tests completed!');
  console.log('📱 Live at: https://history-vs-future.pages.dev');

  await browser.close();
})();
