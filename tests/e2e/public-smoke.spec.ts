import { expect, test, type Page } from '@playwright/test'

function watchBrowserErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  page.on('requestfailed', (request) => {
    errors.push(`request: ${request.method()} ${request.url()} — ${request.failure()?.errorText}`)
  })
  return errors
}

test('public vertical slice renders and filters without browser errors', async ({ page }, testInfo) => {
  const browserErrors = watchBrowserErrors(page)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Trouvez où apprendre et danser/ })).toBeVisible()
  await expect(page.getByText('Pratique libre à Antigone (démo)')).toBeVisible()

  const firstMapTile = page.waitForResponse(
    (response) => response.url().includes('tile.openstreetmap.org') && response.ok(),
  )
  await page.goto('/cours')
  await expect(page.getByRole('heading', { name: 'Planifier ses cours' })).toBeVisible()
  await expect(page.getByText('Initiation du lundi (démo)')).toBeVisible()
  const map = page.getByRole('region', { name: /Carte de 4 lieux/ })
  await expect(map).toBeVisible()
  await firstMapTile
  await testInfo.attach('courses-map', {
    body: await map.screenshot(),
    contentType: 'image/png',
  })

  await page.getByLabel('Niveau').selectOption('intermediaire')
  await expect(page.getByText('Intermédiaire du mercredi (démo)')).toBeVisible()
  await expect(page.getByText('Initiation du lundi (démo)')).toHaveCount(0)

  await page.goto('/agenda')
  await expect(page.getByRole('heading', { name: 'Danser prochainement' })).toBeVisible()
  await expect(page.getByText('Soirée de rentrée annulée (démo)')).toBeVisible()
  await page.getByLabel('Débutants bienvenus').check()
  await expect(page.getByText('Stage musicalité (démo)')).toHaveCount(0)

  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})

test('mobile navigation reaches the course planner without browser errors', async ({ page }) => {
  const browserErrors = watchBrowserErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('link', { name: 'Cours' }).click()
  await expect(page.getByRole('heading', { name: 'Planifier ses cours' })).toBeVisible()
  expect(browserErrors, browserErrors.join('\n')).toEqual([])
})
