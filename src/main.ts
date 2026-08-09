import './style.css'
import { content } from './content/index.js'
import { createInitialState, type GameState } from './core/state/state.js'
import { GameSession } from './core/session.js'
import { AUTOSAVE_SLOT, load, save, SLOTS, type Slot } from './core/save/save.js'
import { getView as dialogueView } from './core/dialogue/dialogue.js'
import { getView as battleView } from './core/desenrolo/desenrolo.js'
import { mountBackdrop } from './engine/backdrop.js'
import { EventBus, ConsoleExporter, NoopExporter } from './observability/events.js'
import { browserClock, LocalSaveStorage } from './platform/browser.js'

const root = document.querySelector<HTMLElement>('#app')!
root.innerHTML = '<div id="game-canvas" aria-hidden="true"></div><section id="ui"></section>'
mountBackdrop('game-canvas')
const ui = document.querySelector<HTMLElement>('#ui')!
const session = new GameSession(content)
const storage = new LocalSaveStorage()
const telemetry = new EventBus(import.meta.env.DEV ? new ConsoleExporter() : new NoopExporter())
const saveSlots: readonly Slot[] = [AUTOSAVE_SLOT, ...SLOTS]
let state: GameState | undefined
let menuOpen = false
let debugOpen = false
let selected = 0
let previousPeriod = ''

function money(value: number): string {
  return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`
}
function period(value: GameState['clock']['period']): string {
  return { morning: 'Manhã', afternoon: 'Tarde', night: 'Noite' }[value]
}
function start(): void {
  const created = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 42 })
  state = session.begin(created).state
  previousPeriod = state.clock.period
  telemetry.emit({ name: 'game_started', at: browserClock.now(), fields: { seed: state.seed } })
  render()
}
function continueGame(): void {
  const loaded = saveSlots
    .map((slot) => load(storage, slot))
    .find((candidate) => candidate.ok)
  if (!loaded?.ok) return
  state = session.begin(loaded.state).state
  previousPeriod = state.clock.period
  render()
}
function act(actionId: string): void {
  if (!state) return
  const before = state
  state = session.performById(state, actionId).state
  telemetry.emit({
    name: 'action',
    at: browserClock.now(),
    fields: { id: actionId, mode: state.mode.kind, place: state.place },
  })
  if (state.clock.period !== previousPeriod) {
    save(storage, AUTOSAVE_SLOT, state, browserClock.now())
    previousPeriod = state.clock.period
  }
  if (state === before) return
  selected = 0
  render()
}
function saveSlot(slot: Slot): void {
  if (!state) return
  save(storage, slot, state, browserClock.now())
  telemetry.emit({ name: 'save', at: browserClock.now(), fields: { slot } })
  render()
}
function title(): string {
  if (!state) return 'GAROA'
  if (state.mode.kind === 'dialogue')
    return (
      content.npcs[dialogueView(state, session.dialogueLookup)?.speaker ?? '']?.name ?? 'São Paulo'
    )
  if (state.mode.kind === 'desenrolo')
    return battleView(state, session.desenroloLookup)?.name ?? 'Desenrolo'
  return content.places[state.place]?.name ?? 'São Paulo'
}
function render(): void {
  if (!state) {
    const canContinue = saveSlots.some((slot) => load(storage, slot).ok)
    ui.innerHTML = `<div class="title-card"><p class="route">TIETÊ · 05:10</p><h1>GAROA</h1><p class="tagline">A cidade não te espera.</p><div class="actions"><button data-command="new">Novo jogo</button>${canContinue ? '<button data-command="continue">Continuar</button>' : ''}</div><p class="keys">Setas/WASD · Enter · Esc · F3</p></div>`
    bind()
    return
  }
  const actions = session.availableActions(state)
  const dialogue = dialogueView(state, session.dialogueLookup)
  const battle = battleView(state, session.desenroloLookup)
  const copy =
    state.mode.kind === 'ended'
      ? '<strong>Fim do Ato 1</strong><span>A pista aponta para a Paulista.</span>'
      : dialogue
        ? `<strong>${dialogue.line}</strong><span>${dialogue.lineIndex + 1}/${dialogue.lineCount}</span>`
        : battle
          ? `<strong>${battle.transcript.at(-1)?.text ?? battle.subtitle ?? ''}</strong><span>Paciência ${battle.patience}/${battle.patienceMax} · turno ${battle.turn}</span>`
          : `<strong>${content.places[state.place]?.blurb ?? 'A cidade segue em movimento.'}</strong><span>Escolha o próximo passo.</span>`
  ui.innerHTML = `<header class="hud"><span>GRANA <b>${money(state.player.money)}</b></span><span>DISPOSIÇÃO <b>${state.player.energy}/${state.player.energyMax}</b></span><span>BILHETE <b>${money(state.player.transit)}</b></span><span>DIA <b>${state.clock.day} · ${period(state.clock.period)}</b></span></header><section class="scene"><p class="route">ATO ${state.act} · ${state.district.toUpperCase()}</p><h2>${title()}</h2><div class="dialogue">${copy}</div><div class="actions">${actions.map((item, index) => `<button data-action="${item.id}" ${item.enabled ? '' : 'disabled'} class="${index === selected ? 'selected' : ''}">${item.label}${item.lockedReason ? ` <small>— ${item.lockedReason}</small>` : ''}</button>`).join('')}</div></section><button class="menu-button" data-command="menu">Caderninho</button>${menuOpen ? menu() : ''}${debugOpen ? debug() : ''}`
  bind()
}
function menu(): string {
  return `<aside class="menu"><h3>Caderninho</h3>${state!.journal.map((entry) => `<p><b>${entry.kind === 'objective' ? 'Objetivo' : entry.kind === 'contact' ? 'Contato' : 'Aprendi'}</b><br>${entry.text}</p>`).join('') || '<p>A primeira página ainda está em branco.</p>'}<h3>Salvar</h3><div class="slots">${SLOTS.map((slot) => `<button data-slot="${slot}">Slot ${slot}</button>`).join('')}</div><button data-command="menu">Fechar</button></aside>`
}
function debug(): string {
  return `<aside class="debug"><b>DEBUG · F3</b><pre>${JSON.stringify({ mode: state!.mode, place: state!.place, seed: state!.seed, rng: state!.rngState }, null, 2)}</pre>${telemetry
    .recent()
    .slice(-5)
    .map((event) => `<code>${event.name}</code>`)
    .join(' ')}</aside>`
}
function bind(): void {
  ui.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) =>
    button.addEventListener('click', () => act(button.dataset.action!))
  )
  ui.querySelector('[data-command="new"]')?.addEventListener('click', start)
  ui.querySelector('[data-command="continue"]')?.addEventListener('click', continueGame)
  ui.querySelectorAll('[data-command="menu"]').forEach((button) =>
    button.addEventListener('click', () => {
      menuOpen = !menuOpen
      render()
    })
  )
  ui.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((button) =>
    button.addEventListener('click', () => saveSlot(button.dataset.slot as Slot))
  )
  ui.querySelector<HTMLButtonElement>('.selected')?.focus({ preventScroll: true })
}
window.addEventListener('keydown', (event) => {
  if (event.key === 'F3') {
    event.preventDefault()
    debugOpen = !debugOpen
    render()
    return
  }
  if (event.key === 'Escape' && state) {
    menuOpen = !menuOpen
    render()
    return
  }
  if (!state || menuOpen) return
  const actions = session.availableActions(state).filter((item) => item.enabled)
  if (['ArrowDown', 's', 'ArrowRight', 'd'].includes(event.key)) {
    event.preventDefault()
    selected = (selected + 1) % Math.max(1, actions.length)
    render()
  }
  if (['ArrowUp', 'w', 'ArrowLeft', 'a'].includes(event.key)) {
    event.preventDefault()
    selected = (selected - 1 + actions.length) % Math.max(1, actions.length)
    render()
  }
  const selectedAction = actions[selected]
  if ((event.key === 'Enter' || event.key === ' ') && selectedAction) {
    event.preventDefault()
    act(selectedAction.id)
  }
})
window.addEventListener('gamepadconnected', () => {
  const poll = (): void => {
    const pad = navigator.getGamepads()[0]
    if (pad?.buttons[0]?.pressed) ui.querySelector<HTMLButtonElement>('.selected')?.click()
    requestAnimationFrame(poll)
  }
  poll()
})
render()
