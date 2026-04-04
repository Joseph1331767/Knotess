import { test, expect } from '@playwright/test';

test.describe('Component Fixes (Phase 02)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible({ timeout: 15000 });
  });

  test('node can be dragged without crashing', async ({ page }) => {
    const rootNode = page.locator('h3').getByText('Root Node');
    const box = await rootNode.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Move significantly
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100, { steps: 5 });
      await page.mouse.up();
    }
    await expect(rootNode).toBeVisible();
  });

  test('NodeEditor opens and pages work', async ({ page }) => {
    const rootNode = page.locator('h3').getByText('Root Node');
    await rootNode.click();

    const openBtn = page.getByTitle('Open Full Editor');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Check if "Pages" sidebar appears
    await expect(page.getByText('Pages')).toBeVisible();

    // Add a page
    const addPageBtn = page.getByTitle('Add Page');
    await addPageBtn.click();

    await expect(page.getByText('Page 2')).toBeVisible();

    // Exit editor
    await page.getByTitle('Exit to Node View').click();
    await expect(page.getByText('Pages')).not.toBeVisible();
  });
});
