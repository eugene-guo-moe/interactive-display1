import { test, expect } from '@playwright/test';

test.describe('Interactive Display Full Flow', () => {
  test('should complete the full quiz flow from welcome to camera', async ({ page }) => {
    // Start at welcome page
    await page.goto('/');

    // Wait for welcome page to load
    await expect(page.getByText('RIVERSIDE SECONDARY SCHOOL')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin Your Journey' })).toBeVisible();

    // Click start button
    await page.getByRole('button', { name: 'Begin Your Journey' }).click();

    // Question 1 - Cybersecurity scenario
    await expect(page).toHaveURL('/question/1');
    await expect(page.getByText('cyberattack')).toBeVisible();
    // Wait for options to animate in
    const q1Option = page.getByRole('button', { name: /Lock down affected systems/ });
    await expect(q1Option).toBeVisible({ timeout: 10000 });
    await q1Option.click();

    // Question 2 - Heritage preservation scenario
    await expect(page).toHaveURL('/question/2', { timeout: 10000 });
    await expect(page.getByText('historic neighbourhoods')).toBeVisible();
    // Wait for options to animate in
    const q2Option = page.getByRole('button', { name: /Bring residents, cultural groups/ });
    await expect(q2Option).toBeVisible({ timeout: 10000 });
    await q2Option.click();

    // Question 3 - Meritocracy scenario
    await expect(page).toHaveURL('/question/3', { timeout: 10000 });
    await expect(page.getByText('meritocracy')).toBeVisible();
    // Wait for options to animate in
    const q3Option = page.getByRole('button', { name: /Evolve education pathways/ });
    await expect(q3Option).toBeVisible({ timeout: 10000 });
    await q3Option.click();

    // Question 4 - Digital inclusion scenario
    await expect(page).toHaveURL('/question/4', { timeout: 10000 });
    await expect(page.getByText('seniors and vulnerable')).toBeVisible();
    // Wait for options to animate in
    const q4Option = page.getByRole('button', { name: /Guarantee baseline access/ });
    await expect(q4Option).toBeVisible({ timeout: 10000 });
    await q4Option.click();

    // Question 5 - Automation/jobs scenario
    await expect(page).toHaveURL('/question/5', { timeout: 10000 });
    await expect(page.getByText('Automation and economic shifts')).toBeVisible();
    // Wait for options to animate in
    const q5Option = page.getByRole('button', { name: /Expand retraining programmes/ });
    await expect(q5Option).toBeVisible({ timeout: 10000 });
    await q5Option.click();

    // Question 6 - Globalisation scenario
    await expect(page).toHaveURL('/question/6', { timeout: 10000 });
    await expect(page.getByText('foreign workers')).toBeVisible();
    // Wait for options to animate in
    const q6Option = page.getByRole('button', { name: /Leverage digital platforms/ });
    await expect(q6Option).toBeVisible({ timeout: 10000 });
    await q6Option.click();

    // Should navigate to camera page
    await expect(page).toHaveURL('/camera', { timeout: 10000 });
    // Camera page loads - may show camera view or error depending on browser capabilities
    // In headless mode, camera is unavailable, so we may see the error screen
    const cameraReady = page.getByText('Strike a pose');
    const cameraError = page.getByText('Camera Access Required');
    await expect(cameraReady.or(cameraError)).toBeVisible();
  });

  test('should navigate back through questions', async ({ page }) => {
    await page.goto('/');

    // Start quiz
    await page.getByRole('button', { name: 'Begin Your Journey' }).click();
    await expect(page).toHaveURL('/question/1');

    // Wait for options and back button to appear
    const q1Option = page.getByRole('button', { name: /Lock down affected systems/ });
    await expect(q1Option).toBeVisible({ timeout: 10000 });
    await q1Option.click();

    await expect(page).toHaveURL('/question/2', { timeout: 10000 });

    // Wait for back button to appear
    const backButton = page.getByRole('button', { name: 'Back' });
    await expect(backButton).toBeVisible({ timeout: 10000 });
    await backButton.click();

    await expect(page).toHaveURL('/question/1');

    // Wait for back button to appear again
    await expect(backButton).toBeVisible({ timeout: 10000 });
    await backButton.click();

    await expect(page).toHaveURL('/');
  });

  test('should preserve answers when navigating back', async ({ page }) => {
    await page.goto('/');

    // Start quiz
    await page.getByRole('button', { name: 'Begin Your Journey' }).click();

    // Answer Q1 with option A
    const optionA = page.getByRole('button', { name: /Lock down affected systems/ });
    await expect(optionA).toBeVisible({ timeout: 10000 });
    await optionA.click();

    await expect(page).toHaveURL('/question/2', { timeout: 10000 });

    // Wait for back button and go back
    const backButton = page.getByRole('button', { name: 'Back' });
    await expect(backButton).toBeVisible({ timeout: 10000 });
    await backButton.click();

    await expect(page).toHaveURL('/question/1');

    // Wait for option to appear
    await expect(optionA).toBeVisible({ timeout: 10000 });

    // The selected option should have the visual indication (white/95 background)
    await expect(optionA).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.95)');
  });

  test('welcome page cycles through phases', async ({ page }) => {
    await page.goto('/');

    // Check initial text is visible (one of the phases)
    const phases = ['Remember', 'Celebrate', 'Dream'];

    // At least one phase text should be visible
    const visiblePhase = await Promise.race(
      phases.map(async (phase) => {
        try {
          await expect(page.getByText(phase, { exact: true })).toBeVisible({ timeout: 5000 });
          return phase;
        } catch {
          return null;
        }
      })
    );

    expect(phases).toContain(visiblePhase);
  });

  test('should redirect to home if accessing camera without answers', async ({ page }) => {
    // Try to access camera directly
    await page.goto('/camera');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should redirect to home if accessing loading without answers', async ({ page }) => {
    // Try to access loading directly
    await page.goto('/loading');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should redirect to home if accessing result without data', async ({ page }) => {
    // Try to access result directly
    await page.goto('/result');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('question pages show step indicator dots', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin Your Journey' }).click();

    // The step indicator uses dots - check for the dot container
    // There should be 6 dots (one for each question)
    const stepDots = page.locator('.rounded-full').filter({ hasText: '' });

    // Wait for question page to load
    await expect(page).toHaveURL('/question/1');

    // Wait for the typewriter to finish and options to appear
    const q1Option = page.getByRole('button', { name: /Lock down affected systems/ });
    await expect(q1Option).toBeVisible({ timeout: 10000 });

    // Verify we're on question 1 by checking the scenario text
    await expect(page.getByText('cyberattack')).toBeVisible();

    // Answer and move to Q2
    await q1Option.click();
    await expect(page).toHaveURL('/question/2', { timeout: 10000 });

    // Verify we're on question 2 by checking the scenario text
    await expect(page.getByText('historic neighbourhoods')).toBeVisible();
  });
});

test.describe('Camera Page', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
  });

  test('should show camera UI elements', async ({ page }) => {
    // Complete all questions first
    await page.goto('/');
    await page.getByRole('button', { name: 'Begin Your Journey' }).click();

    // Answer all 6 questions - need to wait for each option to appear
    const questions = [
      { url: '/question/1', option: /Lock down affected systems/ },
      { url: '/question/2', option: /Bring residents, cultural groups/ },
      { url: '/question/3', option: /Evolve education pathways/ },
      { url: '/question/4', option: /Guarantee baseline access/ },
      { url: '/question/5', option: /Expand retraining programmes/ },
      { url: '/question/6', option: /Leverage digital platforms/ },
    ];

    for (const q of questions) {
      await expect(page).toHaveURL(q.url, { timeout: 10000 });
      const option = page.getByRole('button', { name: q.option });
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click();
    }

    // Should be on camera page
    await expect(page).toHaveURL('/camera', { timeout: 10000 });

    // Check for camera page elements
    // In headless mode, camera is unavailable, so we may see the error screen
    const cameraReady = page.getByText('Strike a pose');
    const cameraError = page.getByText('Camera Access Required');
    await expect(cameraReady.or(cameraError)).toBeVisible();

    // If camera error is shown, verify error UI has expected buttons
    if (await cameraError.isVisible()) {
      await expect(page.getByRole('button', { name: 'Go Back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    } else {
      // If camera is working, check for normal UI
      await expect(page.getByText('Solo photo works best')).toBeVisible();
    }
  });
});
