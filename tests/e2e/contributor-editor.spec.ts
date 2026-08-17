import { expect, test } from '@playwright/test'

function localDateTime(timestamp: number) {
  const date = new Date(timestamp)
  return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

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
  await page.getByRole('button', { name: 'Créer' }).click()
  const createForm = page.getByRole('dialog').locator('form')
  await expect(createForm.getByLabel('Enseignant').locator('option').first()).toBeAttached()
  await expect(createForm.getByLabel('Lieu').locator('option').first()).toBeAttached()
  await createForm.getByLabel('Titre').fill(title)
  await createForm.getByLabel('Résumé', { exact: true }).fill('Résumé créé par le test navigateur.')
  await createForm.getByLabel('Description').fill('Description complète du cours de démonstration.')
  await createForm.getByLabel('Source').fill('https://example.com/editor-test')
  await createForm.getByLabel('Saison').selectOption({ index: 0 })
  await createForm.getByLabel('Niveau').selectOption({ index: 0 })
  await createForm.getByLabel('Inscriptions').selectOption('open')
  await createForm.getByLabel('Tarif résumé').fill('Cours d’essai offert')
  await createForm.getByText('Essai possible').click()
  await createForm.getByRole('button', { name: 'Créer le cours' }).click()

  const card = page.locator('[data-slot="card"]').filter({ hasText: title })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Modifier' }).click()
  const editDialog = page.getByRole('dialog')
  await editDialog.locator('input[name="title"]').fill(updatedTitle)
  await editDialog.locator('select[name="status"]').selectOption('published')
  await editDialog.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(page.getByText(updatedTitle, { exact: true })).toBeVisible()

  const updatedCard = page.locator('[data-slot="card"]').filter({ hasText: updatedTitle })
  await updatedCard.getByRole('button', { name: 'Modifier' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(updatedCard).toHaveCount(0)
  expect(browserErrors).toEqual([])
})

test('seeded contributor publishes an event occurrence into the agenda', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  await page.goto('/connexion')
  await page.getByLabel('Adresse e-mail').fill('fixture-contributor-b@wcsmontpellier.invalid')
  await page.getByLabel('Mot de passe').fill('WcsDemo-2026!')
  await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/compte\/favoris/)
  await page.goto('/contribution')

  const title = `Événement éditeur ${Date.now()}`
  await page.getByRole('tab', { name: 'Événements' }).click()
  await page.getByRole('button', { name: 'Créer' }).click()
  const createForm = page.getByRole('dialog').locator('form')
  await expect(createForm.getByLabel('Organisateur').locator('option').first()).toBeAttached()
  await createForm.getByLabel('Titre').fill(title)
  await createForm.getByLabel('Résumé', { exact: true }).fill('Un événement créé depuis l’éditeur.')
  await createForm.getByLabel('Description').fill('Description complète de l’événement de test.')
  await createForm.getByLabel('Source').fill('https://example.com/event-editor-test')
  const startsAt = Date.now() + 2 * 24 * 60 * 60 * 1000
  await createForm.getByLabel('Début', { exact: true }).fill(localDateTime(startsAt))
  await createForm.getByLabel('Fin').fill(localDateTime(startsAt + 3 * 60 * 60 * 1000))
  await createForm.getByText('Débutants bienvenus').click()
  await createForm.getByRole('button', { name: 'Créer l’événement' }).click()

  const card = page.locator('[data-slot="card"]').filter({ hasText: title })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Modifier' }).click()
  const editDialog = page.getByRole('dialog')
  await editDialog.getByLabel('Publication').selectOption('published')
  await editDialog.getByLabel('Type d’événement').selectOption('workshop')
  await editDialog.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(card.getByText('published')).toBeVisible()

  await page.goto('/agenda')
  await expect(page.getByText(title, { exact: true })).toBeVisible()
  await page.goto('/contribution')
  await page.getByRole('tab', { name: 'Événements' }).click()
  const publishedCard = page.locator('[data-slot="card"]').filter({ hasText: title })
  await publishedCard.getByRole('button', { name: 'Modifier' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(publishedCard).toHaveCount(0)
  expect(browserErrors).toEqual([])
})

test('seeded contributor creates, edits, and deletes places and intervenants', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.goto('/connexion')
  await page.getByLabel('Adresse e-mail').fill('fixture-contributor-a@wcsmontpellier.invalid')
  await page.getByLabel('Mot de passe').fill('WcsDemo-2026!')
  await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/compte\/favoris/)
  await page.goto('/contribution')

  const placeName = `Lieu éditeur ${Date.now()}`
  await page.getByRole('tab', { name: 'Lieux' }).click()
  await page.getByRole('button', { name: 'Créer' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nom').fill(placeName)
  await dialog.getByLabel('Adresse', { exact: true }).fill('1 rue du Test')
  await dialog.getByRole('button', { name: 'Créer le lieu' }).click()
  let card = page.locator('[data-slot="card"]').filter({ hasText: placeName })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Modifier' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ville').fill('Castelnau-le-Lez')
  await dialog.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await card.getByRole('button', { name: 'Modifier' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(card).toHaveCount(0)

  const actorName = `Intervenant éditeur ${Date.now()}`
  await page.getByRole('tab', { name: 'Intervenants' }).click()
  await page.getByRole('button', { name: 'Créer' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Nom').fill(actorName)
  await dialog.getByLabel('Présentation').fill('Présentation de test pour cet intervenant.')
  await dialog.getByRole('button', { name: 'Créer l’intervenant' }).click()
  card = page.locator('[data-slot="card"]').filter({ hasText: actorName })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Modifier' }).click()
  await page.getByRole('dialog').getByLabel('Présentation').fill('Présentation mise à jour.')
  await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await card.getByRole('button', { name: 'Modifier' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(card).toHaveCount(0)
  expect(browserErrors).toEqual([])
})
