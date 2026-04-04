import { test, expect } from '@playwright/test';

test.describe('Knotess Smoke Tests', () => {
  test('app loads and shows the main layout', async ({ page }) => {
    await page.goto('/');

    // The main element should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // The sidebar should render with "Explorer" header
    await expect(page.getByText('Explorer')).toBeVisible();

    // The toolbar should render with "Add Node" button
    await expect(page.getByTitle('Add Node')).toBeVisible();

    // A root node should exist on the canvas
    // The default root node has title "Root Node" in an h3 tag
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible({ timeout: 15000 });
  });

  test('canvas is interactive (no crash on load)', async ({ page }) => {
    await page.goto('/');

    // Wait for root node to appear in the canvas
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible({ timeout: 15000 });

    // Verify the canvas background element exists
    // Looking at Canvas.tsx, the div with id="canvas-bg" is the grid
    const canvasBg = page.locator('#canvas-bg');
    await expect(canvasBg).toBeVisible();
  });
});
