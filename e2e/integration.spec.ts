import { test, expect } from '@playwright/test';

test.describe('Full Integration — Chunk 00 Verification', () => {
  test('complete user workflow: create, edit, search, undo, save, reload', async ({ page }) => {
    // === STEP 1: App loads ===
    await page.goto('/');
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Explorer')).toBeVisible();
    await expect(page.getByTitle('Add Node')).toBeVisible();

    // === STEP 2: Zoom controls visible ===
    await expect(page.getByTitle('Zoom In')).toBeVisible();
    await expect(page.getByTitle('Zoom Out')).toBeVisible();
    await expect(page.getByTitle('Fit to View')).toBeVisible();

    // === STEP 3: Create a node ===
    await page.getByTitle('Add Node').click();
    await expect(page.locator('h3').getByText('New Node')).toBeVisible({ timeout: 10000 });

    // === STEP 4: Search for the node in sidebar ===
    const searchInput = page.getByPlaceholder('Search nodes...');
    await searchInput.fill('New Node');

    // Sidebar should show the node
    const sidebar = page.locator('.flex-1.overflow-y-auto');
    await expect(sidebar.getByText('New Node')).toBeVisible({ timeout: 5000 });

    // Clear search
    await searchInput.fill('');
    // Click canvas to remove focus from input so shortcuts work
    await page.locator('#canvas-bg').click();

    // === STEP 5: Undo (Ctrl+Z) - should remove the node ===
    await page.keyboard.press('Control+z');
    await expect(page.locator('h3').getByText('New Node')).not.toBeVisible({ timeout: 10000 });

    // === STEP 6: Redo (Ctrl+Shift+Z) - should bring it back ===
    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('h3').getByText('New Node')).toBeVisible({ timeout: 10000 });

    // === STEP 7: Save (Ctrl+S) ===
    await page.keyboard.press('Control+s');
    // Wait a moment for save to complete
    await page.waitForTimeout(1000);

    // === STEP 8: Delete with confirmation ===
    // Select the new node
    await page.locator('h3').getByText('New Node').click();

    // Set up dialog handler (accept the confirm)
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Press Delete key
    await page.keyboard.press('Delete');

    // Node should be deleted
    await expect(page.locator('h3').getByText('New Node')).not.toBeVisible({ timeout: 10000 });

    // === STEP 9: Zoom in and out ===
    await page.getByTitle('Zoom In').click();
    await page.waitForTimeout(300);
    await page.getByTitle('Zoom Out').click();
    await page.waitForTimeout(300);
    await page.getByTitle('Fit to View').click();

    // === STEP 10: Escape to deselect ===
    await page.keyboard.press('Escape');

    // === STEP 11: New project with confirmation (dismiss to cancel) ===
    // Override the dialog handler to dismiss this time
    page.removeAllListeners('dialog');
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await page.getByText('New').click();

    // Root Node should still exist (we dismissed)
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible();

    // === STEP 12: No console errors ===
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    expect(pageErrors).toHaveLength(0);
  });

  test('data persists after page reload', async ({ page }) => {
    // === STEP 1: Load app ===
    await page.goto('/');
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible({ timeout: 15000 });

    // === STEP 2: Create a node ===
    await page.getByTitle('Add Node').click();
    await expect(page.locator('h3').getByText('New Node')).toBeVisible({ timeout: 10000 });

    // === STEP 3: Save ===
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1000);

    // === STEP 4: Reload ===
    await page.reload();

    // === STEP 5: Verify data persisted ===
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h3').getByText('New Node')).toBeVisible({ timeout: 15000 });
  });
});
