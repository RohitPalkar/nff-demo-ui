import { expect, test } from '@playwright/test'

test('home page renders the hero and content tabs', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'A gentler way to understand your mind.',
    }),
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Foundations' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Understand' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign up' }).first()).toBeVisible()
})

test('tab query parameter selects a tab', async ({ page }) => {
  await page.goto('/?tab=contemplate')
  await expect(page.getByRole('tab', { name: 'Contemplate' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('explorations catalogue filters by category', async ({ page }) => {
  await page.goto('/explorations?tab=understand')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Explorations' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Filter by category' })
      .getByRole('link', { name: 'Understand' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('heading', { name: 'How the mind meets the moment' }),
  ).toBeVisible()
})
