import { expect, test } from '@playwright/test'

test('seeded contributor creates, edits, publishes, and archives an owned class', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  await page.goto('/connexion')
  await page.getByLabel('Adresse e-mail').fill('fixture-contributor-a@wcsmontpellier.invalid')
  await page.getByLabel('Mot de passe').fill('WcsDemo-2026!')
  await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/compte\/favoris/)
  await page.goto('/contribution')

  const title = `Cours éditeur ${Date.now()}`
  const updatedTitle = `${title} modifié`
  const createForm = page.locator('form').first()
  await createForm.getByLabel('Titre').fill(title)
  await createForm.getByLabel('Résumé', { exact: true }).fill('Résumé créé par le test navigateur.')
  await createForm.getByLabel('Description').fill('Description complète du cours de démonstration.')
  await createForm.getByLabel('Source').fill('https://example.com/editor-test')
  await createForm.getByLabel('Saison').selectOption({ index: 0 })
  await createForm.getByLabel('Niveau').selectOption({ index: 0 })
  await createForm.getByLabel('Inscriptions').selectOption('open')
  await createForm.getByLabel('Tarif résumé').fill('Cours d’essai offert')
  await createForm.getByText('Essai possible').click()
  await createForm.getByRole('button', { name: 'Créer le brouillon' }).click()

  const card = page.locator('[data-slot="card"]').filter({ hasText: title })
  await expect(card).toBeVisible()
  await card.getByText('Modifier la fiche et ses détails').click()
  await card.locator('input[name="title"]').fill(updatedTitle)
  await card.locator('select[name="status"]').selectOption('published')
  await card.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText(updatedTitle, { exact: true })).toBeVisible()

  const updatedCard = page.locator('[data-slot="card"]').filter({ hasText: updatedTitle })
  await updatedCard.getByRole('button', { name: 'Archiver' }).click()
  await expect(updatedCard).toHaveCount(0)
  expect(browserErrors).toEqual([])
})
