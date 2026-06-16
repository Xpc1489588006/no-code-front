import { test, expect } from '@playwright/test'

test('visits the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '一句话创建应用' })).toBeVisible()
  await expect(page.getByText('我的作品')).toBeVisible()
  await expect(page.getByText('精选案例')).toBeVisible()
})
