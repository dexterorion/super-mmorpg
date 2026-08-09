import { mkdir, writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const reportDirectory = 'playtest-report/screenshots'
async function shot(page: Page, name: string): Promise<void> {
  await mkdir(reportDirectory, { recursive: true })
  await page.screenshot({ path: `${reportDirectory}/${name}.png`, fullPage: true })
}
async function action(page: Page, id: string): Promise<void> {
  await page.locator(`[data-action="${id}"]`).evaluate((element: HTMLElement) => element.click())
}

test('Act 1 visual route, keyboard, save and reload', async ({ page, browserName }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    const firefoxNavigationAbort =
      browserName === 'firefox' && text.includes('InvalidStateError: Navigated away from page')
    if (message.type() === 'error' && !firefoxNavigationAbort) errors.push(text)
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'GAROA' })).toBeVisible()
  if (browserName === 'chromium') await shot(page, '01-title')
  await page.getByRole('button', { name: 'Novo jogo' }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /Artista/ }).click()
  await page.getByRole('button', { name: /Quarto em pensão/ }).click()
  await expect(page.getByText('5h10. O ônibus para')).toBeVisible()
  if (browserName === 'chromium') await shot(page, '02-arrival')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await action(page, 'choice:prudente')
  if (browserName === 'chromium') await shot(page, '02b-exploration')
  const canvasBeforeMove = await page.locator('#game-canvas canvas').screenshot()
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(450)
  await page.keyboard.up('ArrowRight')
  const canvasAfterMove = await page.locator('#game-canvas canvas').screenshot()
  expect(canvasAfterMove).not.toEqual(canvasBeforeMove)
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
  const busMode = page.locator('[data-travel-mode="bus"]')
  await busMode.click()
  await expect(busMode).toHaveClass(/active/)
  await expect(
    page.getByRole('heading', { name: 'Estudar é possível. O caminho não é igual.' })
  ).toBeVisible()
  await expect(page.getByText(/Curso técnico/)).toBeVisible()
  await page.locator('[data-slot="1"]').click()
  if (browserName === 'chromium') await shot(page, '04-caderninho')
  await page.getByRole('button', { name: 'Fechar' }).click()
  const hudBefore = await page.locator('.hud').textContent()
  await page.reload()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.locator('.hud')).toHaveText(hudBefore ?? '')
  await page.getByRole('button', { name: 'Caderninho' }).click()
  await expect(page.locator('[data-travel-mode="bus"]')).toHaveClass(/active/)
  expect(errors).toEqual([])
})

test('complete five-act campaign through the real UI', async ({ page, browserName }) => {
  test.setTimeout(180_000)
  test.skip(browserName !== 'chromium', 'One full browser route is enough; Firefox covers Act 1.')
  await page.goto('/')
  await page.getByRole('button', { name: 'Novo jogo' }).click()
  await page.getByRole('button', { name: /Artista/ }).click()
  await page.getByRole('button', { name: /Quarto em pensão/ }).click()
  const usedArguments = new Set<string>()
  const captured = new Set<string>()
  let talkedToJorge = false
  for (let step = 0; step < 180; step += 1) {
    const ending = page.getByText(/Fim ·/)
    if (await ending.count()) {
      await shot(page, '09-ending')
      await expect(ending).toBeVisible()
      return
    }
    const heading = (await page.locator('.scene h2').textContent()) ?? ''
    const capture: Record<string, string> = {
      'A fila da repartição': '05-reparticao',
      'A entrevista': '06-entrevista',
      'A água subindo': '07-enchente',
      'A conversa no Minhocão': '08-minhocao',
    }
    const captureName = capture[heading]
    if (captureName && !captured.has(captureName)) {
      await shot(page, captureName)
      captured.add(captureName)
    }
    if (heading === 'Anhangabaú' && !talkedToJorge && !captured.has('02c-npc')) {
      await shot(page, '02c-npc')
      captured.add('02c-npc')
    }
    const buttons = page.locator('[data-action]:not([disabled])')
    const ids = await buttons.evaluateAll((nodes) => nodes.map((node) => node.dataset.action ?? ''))
    const has = (id: string): boolean => ids.includes(id)
    const click = async (id: string): Promise<boolean> => {
      if (!has(id)) return false
      await action(page, id)
      return true
    }
    if (await click('advance')) continue
    const choices = [
      'choice:prudente',
      'choice:reclamar',
      'choice:direto',
      'choice:pedir',
      'choice:fila',
      'choice:recusar',
      'choice:agua',
      'choice:fica',
      'choice:responder',
    ]
    let acted = false
    for (const choice of choices)
      if (await click(choice)) {
        acted = true
        break
      }
    if (acted) continue
    if (await click('battle:begin')) {
      usedArguments.clear()
      continue
    }
    if (await click('battle:observe')) continue
    const freshArgument = ids.find((id) => id.startsWith('battle:argue:') && !usedArguments.has(id))
    if (freshArgument) {
      usedArguments.add(freshArgument)
      await action(page, freshArgument)
      continue
    }
    if (await click('battle:insist')) continue
    if (await click('battle:ack')) {
      usedArguments.clear()
      continue
    }
    const byPlace: Record<string, readonly string[]> = {
      'Plataforma de desembarque': ['walk:tiete_saguao'],
      'Saguão do Tietê': ['do:ligar_val', 'walk:tiete_metro'],
      'Metrô Tietê': ['travel:centro', 'do:comprar_bilhete'],
      República: ['travel:bixiga', 'walk:centro_anhangabau'],
      Anhangabaú: talkedToJorge ? ['walk:centro_republica'] : ['talk:seu_jorge'],
      'Ladeira do Bixiga': ['walk:bixiga_pensao_porta'],
      'Porta da pensão': ['walk:bixiga_quarto'],
    }
    for (const id of byPlace[heading] ?? ids)
      if (await click(id)) {
        if (id === 'talk:seu_jorge') talkedToJorge = true
        acted = true
        break
      }
    expect(acted, `No action selected at ${heading}: ${ids.join(', ')}`).toBe(true)
  }
  throw new Error('Complete browser campaign exceeded 180 actions')
})

test.afterAll(async () => {
  await mkdir('playtest-report', { recursive: true })
  await writeFile(
    'playtest-report/index.html',
    '<!doctype html><meta charset="utf-8"><title>GAROA playtest</title><style>body{background:#101923;color:#f0eadb;font:16px monospace}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}img{width:100%;border:3px solid #f0eadb}</style><h1>GAROA — visual playtest</h1><main><img src="screenshots/01-title.png"><img src="screenshots/02-arrival.png"><img src="screenshots/02b-exploration.png"><img src="screenshots/02c-npc.png"><img src="screenshots/03-desenrolo.png"><img src="screenshots/04-caderninho.png"><img src="screenshots/05-reparticao.png"><img src="screenshots/06-entrevista.png"><img src="screenshots/07-enchente.png"><img src="screenshots/08-minhocao.png"><img src="screenshots/09-ending.png"></main>'
  )
})
