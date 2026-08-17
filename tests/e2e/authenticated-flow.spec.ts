import { expect, test } from '@playwright/test'

test('account session and favorites persist across sign-out', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  const email = `playwright-${Date.now()}@test.invalid`
  const password = 'Test-password-2026!'

  await page.goto('/connexion')
  await page.getByRole('button', { name: 'Pas encore de compte' }).click()
  await page.getByLabel('Nom affiché').fill('Compte Playwright')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page).toHaveURL(/compte\/favoris/)

  await page.goto('/cours')
  await page.getByRole('button', { name: 'Ajouter aux favoris' }).first().click()
  await expect(page.getByRole('button', { name: 'Retirer des favoris' }).first()).toBeVisible()
  await page.goto('/compte/favoris')
  await expect(page.getByRole('button', { name: 'Retirer' })).toBeVisible()

  await page.getByRole('button', { name: 'Déconnexion' }).click()
  await expect(page.getByRole('button', { name: 'Se connecter' }).first()).toBeVisible()
  await page.goto('/connexion')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/compte\/favoris/)
  await expect(page.getByRole('button', { name: 'Retirer' })).toBeVisible()
  expect(browserErrors).toEqual([])
})
