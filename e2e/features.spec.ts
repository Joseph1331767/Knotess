import { test, expect } from '@playwright/test';

test.describe('Standard Features (Phase 03)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible({ timeout: 15000 });
  });

  test('keyboard shortcut Ctrl+Z undoes last action', async ({ page }) => {
    // Add a node
    await page.getByTitle('Add Node').click();
    await expect(page.locator('h3').getByText('New Node')).toBeVisible({ timeout: 5000 });

    // Undo
    await page.keyboard.press('Control+z');

    // The new node should be gone
    await expect(page.locator('h3').getByText('New Node')).not.toBeVisible({ timeout: 5000 });
  });

  test('Escape key deselects all nodes', async ({ page }) => {
    // Click root node to select
    await page.locator('h3').getByText('Root Node').click();

    // The delete button should appear (indicating selection)
    await expect(page.getByTitle('Delete')).toBeVisible({ timeout: 3000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Delete button should disappear (node deselected)
    await expect(page.getByTitle('Delete')).not.toBeVisible({ timeout: 3000 });
  });

  test('sidebar search filters nodes', async ({ page }) => {
    // Type in the search box
    const searchInput = page.getByPlaceholder('Search nodes...');
    await searchInput.fill('nonexistent');

    // Root Node should be hidden in the sidebar tree
    const sidebarTree = page.locator('div.w-72'); // The sidebar container
    await expect(sidebarTree.getByText('Root Node')).not.toBeVisible({ timeout: 3000 });

    // Clear search
    await searchInput.fill('');

    // Root Node should reappear
    await expect(sidebarTree.getByText('Root Node')).toBeVisible({ timeout: 3000 });
  });

  test('zoom controls are visible and clickable', async ({ page }) => {
    // Zoom controls should be visible
    await expect(page.getByTitle('Zoom In')).toBeVisible();
    await expect(page.getByTitle('Zoom Out')).toBeVisible();
    await expect(page.getByTitle('Fit to View')).toBeVisible();

    // Check zoom percentage text
    await expect(page.getByText('100%')).toBeVisible();

    // Click zoom in
    await page.getByTitle('Zoom In').click();

    // Zoom percentage should increase (1.3x)
    await expect(page.getByText('130%')).toBeVisible({ timeout: 2000 });
  });

  test('destructive action shows confirmation', async ({ page }) => {
    // Set up dialog handler
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();
    });

    // Click "New" button (which should trigger confirmation)
    await page.getByTitle('New Project').click();

    // Root Node should still exist (we dismissed the dialog)
    expect(dialogAppeared).toBe(true);
    await expect(page.locator('h3').getByText('Root Node')).toBeVisible();
  });
});
