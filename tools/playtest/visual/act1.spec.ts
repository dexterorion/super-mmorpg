import { mkdir, writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const reportDirectory = 'playtest-report/screenshots'
async function shot(page: Page, name: string): Promise<void> {
  await mkdir(reportDirectory, { recursive: true })
  await page.screenshot({ path: `${reportDirectory}/${name}.png`, fullPage: true })
}
async function action(page: Page, id: string): Promise<void> {
  await page.locator(`[data-action="${id}"]`).click()
}

test('Act 1 visual route, keyboard, save and reload', async ({ page, browserName }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  const startedAt = Date.now()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'GAROA' })).toBeVisible()
  if (browserName === 'chromium') await shot(page, '01-title')
  await page.getByRole('button', { name: 'Novo jogo' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('5h10. O ônibus para')).toBeVisible()
  if (browserName === 'chromium') await shot(page, '02-arrival')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await action(page, 'choice:prudente')
  await action(page, 'walk:tiete_saguao')
  await action(page, 'advance')
  await action(page, 'choice:reclamar')
  await action(page, 'battle:begin')
  await expect(page.getByText(/Paciência/)).toBeVisible()
  if (browserName === 'chromium') await shot(page, '03-desenrolo')
  await action(page, 'battle:observe')
  await action(page, 'battle:observe')
  await action(page, 'battle:argue:seguranca')
  await action(page, 'battle:argue:preco')
  await action(page, 'battle:argue:devolve')
  while ((await page.locator('[data-action="battle:ack"]').count()) === 0)
    await action(page, 'battle:insist')
  await action(page, 'battle:ack')
  await action(page, 'walk:tiete_metro')
  await action(page, 'do:comprar_bilhete')
  await page.getByRole('button', { name: 'Caderninho' }).click()
  await page.locator('[data-slot="1"]').click()
  if (browserName === 'chromium') await shot(page, '04-caderninho')
  await page.getByRole('button', { name: 'Fechar' }).click()
  const hudBefore = await page.locator('.hud').textContent()
  await page.reload()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.locator('.hud')).toHaveText(hudBefore ?? '')
  expect(Date.now() - startedAt).toBeLessThan(15_000)
  expect(errors).toEqual([])
})

test.afterAll(async () => {
  await mkdir('playtest-report', { recursive: true })
  await writeFile(
    'playtest-report/index.html',
    '<!doctype html><meta charset="utf-8"><title>GAROA playtest</title><style>body{background:#101923;color:#f0eadb;font:16px monospace}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}img{width:100%;border:3px solid #f0eadb}</style><h1>GAROA — visual playtest</h1><main><img src="screenshots/01-title.png"><img src="screenshots/02-arrival.png"><img src="screenshots/03-desenrolo.png"><img src="screenshots/04-caderninho.png"></main>'
  )
})
