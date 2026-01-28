import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://interactive-display.pages.dev';

test.describe('Production Site Full Flow', () => {
  test.use({ baseURL: PRODUCTION_URL });

  test('should complete the full quiz flow from welcome to camera', async ({ page }) => {
    // Start at welcome page
    await page.goto('/');

    // Wait for welcome page to load
    await expect(page.getByText('RIVERSIDE SECONDARY SCHOOL')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Begin Your Journey' })).toBeVisible();

    // Click start button
    await page.getByRole('button', { name: 'Begin Your Journey' }).click();

    // Question 1 - Cybersecurity scenario
    await expect(page).toHaveURL(/\/question\/1/);
    await expect(page.getByText('cyberattack')).toBeVisible({ timeout: 15000 });
    // Wait for options to animate in
    const q1Option = page.getByRole('button', { name: /Lock down affected systems/ });
    await expect(q1Option).toBeVisible({ timeout: 10000 });
    await q1Option.click();

    // Question 2 - Heritage preservation scenario
    await expect(page).toHaveURL(/\/question\/2/, { timeout: 10000 });
    await expect(page.getByText('historic neighbourhoods')).toBeVisible({ timeout: 15000 });
    const q2Option = page.getByRole('button', { name: /Bring residents, cultural groups/ });
    await expect(q2Option).toBeVisible({ timeout: 10000 });
    await q2Option.click();

    // Question 3 - Meritocracy scenario
    await expect(page).toHaveURL(/\/question\/3/, { timeout: 10000 });
    await expect(page.getByText('meritocracy')).toBeVisible({ timeout: 15000 });
    const q3Option = page.getByRole('button', { name: /Evolve education pathways/ });
    await expect(q3Option).toBeVisible({ timeout: 10000 });
    await q3Option.click();

    // Question 4 - Digital inclusion scenario
    await expect(page).toHaveURL(/\/question\/4/, { timeout: 10000 });
    await expect(page.getByText('seniors and vulnerable')).toBeVisible({ timeout: 15000 });
    const q4Option = page.getByRole('button', { name: /Guarantee baseline access/ });
    await expect(q4Option).toBeVisible({ timeout: 10000 });
    await q4Option.click();

    // Question 5 - Automation/jobs scenario
    await expect(page).toHaveURL(/\/question\/5/, { timeout: 10000 });
    await expect(page.getByText('Automation and economic shifts')).toBeVisible({ timeout: 15000 });
    const q5Option = page.getByRole('button', { name: /Expand retraining programmes/ });
    await expect(q5Option).toBeVisible({ timeout: 10000 });
    await q5Option.click();

    // Question 6 - Globalisation scenario
    await expect(page).toHaveURL(/\/question\/6/, { timeout: 10000 });
    await expect(page.getByText('foreign workers')).toBeVisible({ timeout: 15000 });
    const q6Option = page.getByRole('button', { name: /Leverage digital platforms/ });
    await expect(q6Option).toBeVisible({ timeout: 10000 });
    await q6Option.click();

    // Should navigate to camera page
    await expect(page).toHaveURL(/\/camera/, { timeout: 10000 });

    // Camera page loads - may show camera view or error depending on browser capabilities
    const cameraReady = page.getByText('Strike a pose');
    const cameraError = page.getByText('Camera Access Required');
    await expect(cameraReady.or(cameraError)).toBeVisible({ timeout: 15000 });
  });

  test('should protect routes - redirect to home without quiz completion', async ({ page }) => {
    // Try to access camera directly
    await page.goto('/camera');
    await expect(page).toHaveURL(PRODUCTION_URL + '/');

    // Try to access loading directly
    await page.goto('/loading');
    await expect(page).toHaveURL(PRODUCTION_URL + '/');

    // Try to access result directly
    await page.goto('/result');
    await expect(page).toHaveURL(PRODUCTION_URL + '/');
  });

  test('should navigate back through questions', async ({ page }) => {
    await page.goto('/');

    // Start quiz
    await page.getByRole('button', { name: 'Begin Your Journey' }).click();
    await expect(page).toHaveURL(/\/question\/1/);

    // Wait for options and back button to appear
    const q1Option = page.getByRole('button', { name: /Lock down affected systems/ });
    await expect(q1Option).toBeVisible({ timeout: 10000 });
    await q1Option.click();

    await expect(page).toHaveURL(/\/question\/2/, { timeout: 10000 });

    // Wait for back button to appear
    const backButton = page.getByRole('button', { name: 'Back' });
    await expect(backButton).toBeVisible({ timeout: 10000 });
    await backButton.click();

    await expect(page).toHaveURL(/\/question\/1/);
  });
});
