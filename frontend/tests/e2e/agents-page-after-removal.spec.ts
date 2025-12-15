import { test, expect } from '@playwright/test'

test.describe('Agents Page - After Spawn Agent Removal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')
  })

  test('should not show Spawn Agent button', async ({ page }) => {
    const spawnButton = page.locator('button:has-text("Spawn Agent")')
    await expect(spawnButton).toHaveCount(0)
  })

  test('should not show Activate buttons', async ({ page }) => {
    const activateButtons = page.locator('button:has-text("Activate")')
    await expect(activateButtons).toHaveCount(0)
  })

  test('should not show Create First Agent button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create First Agent")')
    await expect(createButton).toHaveCount(0)
  })

  test('should display agents list', async ({ page }) => {
    const agentCards = page.locator('[class*="agent"]').first()
    await expect(agentCards).toBeVisible()
  })

  test('should have working search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('test')
  })

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })

  test('should take screenshot of clean UI', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    await page.screenshot({
      path: 'test-results/agents-page-after-spawn-removal.png',
      fullPage: true
    })
  })

  test('should have working refresh button', async ({ page }) => {
    const refreshButton = page.locator('button[aria-label*="refresh"]').or(
      page.locator('button:has-text("Refresh")')
    )

    await expect(refreshButton).toBeVisible()
    await refreshButton.click()
  })
})
