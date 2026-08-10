import './style.css'
import { content } from './content/index.js'
import { archetypes } from './content/archetypes.js'
import { housing } from './content/housing.js'
import type { ArchetypeId, HousingId } from './core/types.js'
import { createInitialState, type GameState } from './core/state/state.js'
import { GameSession } from './core/session.js'
import { AUTOSAVE_SLOT, load, save, SLOTS, type Slot } from './core/save/save.js'
import { getView as dialogueView } from './core/dialogue/dialogue.js'
import { getView as battleView } from './core/desenrolo/desenrolo.js'
import { mountBackdrop } from './engine/backdrop.js'
import { AudioDirector } from './engine/audio.js'
import { allCommutes, type TravelMode } from './core/life/commute.js'
import {
  allEducationAssessments,
  educationPaths,
  enrollInEducation,
  type EducationPathId,
} from './core/life/education.js'
import { activeConjuncture } from './core/life/conjuncture.js'
import { currentCareer } from './core/life/career.js'
import { EventBus, ConsoleExporter, NoopExporter } from './observability/events.js'
import { browserClock, LocalSaveStorage } from './platform/browser.js'

const root = document.querySelector<HTMLElement>('#app')!
root.innerHTML =
  '<div id="game-canvas" aria-hidden="true"></div><div id="world-prompt"></div><section id="ui"></section>'
const world = mountBackdrop('game-canvas')
const audio = new AudioDirector()
const ui = document.querySelector<HTMLElement>('#ui')!
const worldPrompt = document.querySelector<HTMLElement>('#world-prompt')!
const session = new GameSession(content)
const storage = new LocalSaveStorage()
const telemetry = new EventBus(import.meta.env.DEV ? new ConsoleExporter() : new NoopExporter())
const saveSlots: readonly Slot[] = [AUTOSAVE_SLOT, ...SLOTS]
let state: GameState | undefined
let menuOpen = false
let debugOpen = false
let selected = 0
let previousPeriod = ''
let creatingCharacter = false
let selectedArchetype: ArchetypeId | undefined
world.onAction((actionId) => act(actionId))
world.onPrompt((label) => {
  worldPrompt.textContent = label ? `ESPAÇO · ${label}` : ''
  worldPrompt.classList.toggle('visible', label !== undefined)
})

function money(value: number): string {
  return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`
}
function period(value: GameState['clock']['period']): string {
  return { morning: 'Manhã', afternoon: 'Tarde', night: 'Noite' }[value]
}
function time(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
function start(archetype: ArchetypeId, housingId: HousingId): void {
  audio.start()
  const archetypeProfile = archetypes[archetype]
  const selectedHousing = housing[housingId]
  const created = createInitialState({
    name: 'Jaci',
    hometown: 'prudente',
    seed: 42,
    archetype,
    profile: {
      startingMoney: archetypeProfile.startingMoney,
      energy: archetypeProfile.energy,
      stats: archetypeProfile.stats,
      occupation: archetypeProfile.occupation,
      monthlyIncome: archetypeProfile.monthlyIncome,
      housing: selectedHousing.id,
      monthlyRent: selectedHousing.monthlyRent,
    },
  })
  state = session.begin(created).state
  previousPeriod = state.clock.period
  telemetry.emit({ name: 'game_started', at: browserClock.now(), fields: { seed: state.seed } })
  render()
}
function continueGame(): void {
  audio.start()
  const loaded = saveSlots.map((slot) => load(storage, slot)).find((candidate) => candidate.ok)
  if (!loaded?.ok) return
  state = session.begin(loaded.state).state
  previousPeriod = state.clock.period
  render()
}
function act(actionId: string): void {
  if (!state) return
  audio.cue(actionId)
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
function chooseTravelMode(mode: TravelMode): void {
  if (!state) return
  state = { ...state, player: { ...state.player, preferredTravelMode: mode } }
  save(storage, AUTOSAVE_SLOT, state, browserClock.now())
  audio.cue('choice:travel-mode')
  render()
}
function chooseEducation(pathId: EducationPathId): void {
  if (!state) return
  state = enrollInEducation(state, pathId)
  save(storage, AUTOSAVE_SLOT, state, browserClock.now())
  audio.cue('choice:education')
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
    ui.innerHTML = creatingCharacter
      ? selectedArchetype
        ? `<div class="title-card character-creation"><p class="route">ESCOLHA ONDE MORAR</p><h1>Casa, custo e distância</h1><p class="tagline">Aluguel menor quase sempre cobra tempo em troca.</p><div class="archetypes">${Object.values(
            housing
          )
            .map(
              (entry) =>
                `<button data-housing="${entry.id}"><b>${entry.name}</b><span>${entry.description}</span><small>${money(entry.monthlyRent)}/mês · ${entry.commuteMinutes} min</small></button>`
            )
            .join('')}</div><button data-command="back-archetype">Voltar</button></div>`
        : `<div class="title-card character-creation"><p class="route">ESCOLHA UM PONTO DE PARTIDA</p><h1>Quem chega?</h1><p class="tagline">Arquétipo não é destino. É onde sua vida começa.</p><div class="archetypes">${Object.values(
            archetypes
          )
            .map(
              (entry) =>
                `<button data-archetype="${entry.id}"><b>${entry.name}</b><span>${entry.description}</span><small>${money(entry.monthlyIncome)}/mês</small></button>`
            )
            .join('')}</div><button data-command="back">Voltar</button></div>`
      : `<div class="title-card"><p class="route">TIETÊ · 05:10</p><h1>GAROA</h1><p class="tagline">A cidade não te espera.</p><div class="actions"><button data-command="new">Novo jogo</button>${canContinue ? '<button data-command="continue">Continuar</button>' : ''}</div><p class="keys">Setas/WASD · Enter · Esc · F3</p></div>`
    bind()
    return
  }
  const actions = session
    .availableActions(state)
    .filter(
      (item) =>
        item.group !== 'life' &&
        item.group !== 'agenda' &&
        item.group !== 'career' &&
        item.group !== 'housing'
    )
  const dialogue = dialogueView(state, session.dialogueLookup)
  const battle = battleView(state, session.desenroloLookup)
  const conjuncture = activeConjuncture(state)
  const exploring = state.mode.kind === 'world'
  const copy =
    state.mode.kind === 'ended'
      ? `<strong>Fim · ${endingTitle(state.mode.endingId)}</strong><span>A garoa continua. A cidade também.</span>`
      : dialogue
        ? `<strong>${dialogue.line}</strong><span>${dialogue.lineIndex + 1}/${dialogue.lineCount}</span>`
        : battle
          ? `<strong>${battle.transcript.at(-1)?.text ?? battle.subtitle ?? ''}</strong><span>Paciência ${battle.patience}/${battle.patienceMax} · turno ${battle.turn}</span>`
          : `<strong>${content.places[state.place]?.blurb ?? 'Explore o bairro.'}</strong><span>Ande com as setas/WASD. Aproxime-se e use Espaço.</span>`
  ui.innerHTML = `<header class="hud"><span>GRANA <b>${money(state.player.money)}</b></span><span>DISPOSIÇÃO <b>${state.player.energy}/${state.player.energyMax}</b></span><span>BILHETE <b>${money(state.player.transit)}</b></span><span>DIA <b>${state.clock.day} · ${time(state.clock.minuteOfDay)} · ${period(state.clock.period)}</b></span></header>${conjuncture ? `<aside class="news-flash"><b>RADAR DA CIDADE</b><span>${conjuncture.headline}</span><small>${conjuncture.fact}</small></aside>` : ''}<section class="scene ${exploring ? 'exploring' : ''}"><p class="route">ATO ${state.act} · ${state.district.toUpperCase()}</p><h2>${title()}</h2><div class="dialogue">${copy}</div><div class="actions ${exploring ? 'world-actions' : ''}">${actions.map((item, index) => `<button data-action="${item.id}" ${item.enabled ? '' : 'disabled'} class="${index === selected ? 'selected' : ''}">${item.label}${item.lockedReason ? ` <small>— ${item.lockedReason}</small>` : ''}</button>`).join('')}</div></section><div class="utility-buttons"><button class="sound-button" data-command="sound" aria-label="${audio.isMuted() ? 'Ativar som' : 'Silenciar som'}">${audio.isMuted() ? 'SOM OFF' : 'SOM ON'}</button><button class="menu-button" data-command="menu">Caderninho</button></div>${menuOpen ? menu() : ''}${debugOpen ? debug() : ''}`
  bind()
  world.sync({
    placeId: state.place,
    placeName: content.places[state.place]?.name ?? state.place,
    district: state.district,
    actors: actions
      .filter((item) => item.enabled && item.group === 'people')
      .map((item) => ({
        id: item.id,
        label: item.label,
        kind: 'npc' as const,
      })),
    exits: actions
      .filter((item) => item.enabled && item.group === 'move')
      .map((item) => ({ actionId: item.id, label: item.label })),
    enabled: exploring && !menuOpen,
  })
  audio.sync({ district: state.district, period: state.clock.period, mode: state.mode.kind })
}
function endingTitle(id: string): string {
  return (
    {
      rede_fica: 'A rede fica',
      rede_vai: 'Voltar também é caminho',
      horizonte_fica: 'Reconstruir pontes',
      horizonte_vai: 'Outra manhã',
    }[id] ?? 'Fim de GAROA'
  )
}
function menu(): string {
  const player = state!.player
  const home = housing[player.housing]
  const modeName: Record<TravelMode, string> = {
    walk: 'A pé',
    bike: 'Bike',
    bus: 'Busão',
    metro: 'Metrô',
  }
  const estimates = allCommutes({
    referenceMinutes: home.commuteMinutes,
    peak: state!.clock.period !== 'night',
    raining: true,
  })
  const selectedCommute = estimates.find(
    (estimate) => estimate.mode === player.preferredTravelMode
  )!
  const career = currentCareer(state!)
  const education = allEducationAssessments({
    archetype: player.archetype,
    monthlyDisposableIncome: Math.max(0, player.monthlyIncome - player.monthlyRent),
    weeklyWorkHours: career.weeklyHours,
    commuteMinutesPerDay: selectedCommute.minutes * 2,
    scheduleFlexibility: career.flexibility,
  })
  const difficulty = (score: number): string =>
    score <= 8 ? 'cabe na rotina' : score <= 18 ? 'exige rearranjo' : 'sacrifício alto'
  const enrollment = state!.education
  const educationStatus = enrollment
    ? `<p><b>${educationPaths[enrollment.pathId].name}</b><br>${enrollment.status === 'completed' ? 'Concluído' : `${enrollment.completedMonths}/${educationPaths[enrollment.pathId].durationMonths} meses concluídos`}</p>`
    : '<p>Nenhuma matrícula ativa.</p>'
  const family = state!.family
  const partner = family.partnership
    ? (content.npcs[family.partnership.partnerNpcId]?.name ?? family.partnership.partnerNpcId)
    : undefined
  const impact = session.familyImpact(state!)
  const familyActions = session.availableActions(state!).filter((item) => item.group === 'life')
  const agendaActions = session.availableActions(state!).filter((item) => item.group === 'agenda')
  const careerActions = session.availableActions(state!).filter((item) => item.group === 'career')
  const housingActions = session.availableActions(state!).filter((item) => item.group === 'housing')
  const relationshipStatus = partner
    ? `${family.partnership!.status === 'married' ? 'Casamento' : 'Parceria'} com ${partner}`
    : 'Sem parceria; vínculos de confiança podem virar uma vida a dois.'
  const childrenStatus =
    family.children.length > 0
      ? family.children.map((child) => `${child.name} · ${child.age}`).join(', ')
      : family.childrenDecision === 'yes'
        ? 'Decisão: queremos filhos.'
        : family.childrenDecision === 'no'
          ? 'Decisão: não queremos filhos.'
          : 'A decisão sobre filhos está em aberto.'
  return `<aside class="menu"><h3>Vida em São Paulo</h3><p><b>${archetypes[player.archetype].name}</b> · ${player.occupation}<br>Renda ${money(player.monthlyIncome)}/mês · aluguel ${money(player.monthlyRent)}/mês</p><p><b>Moradia</b><br>${home.name} · conforto ${home.comfort}/5</p><h3>Agenda de hoje</h3><div class="education agenda-actions">${agendaActions.map((item) => `<article><button data-action="${item.id}" ${item.enabled ? '' : 'disabled'}>${item.label}</button>${item.lockedReason ? `<small>${item.lockedReason}</small>` : ''}</article>`).join('')}</div><h3>Carreira</h3><p>${career.weeklyHours}h/semana · flexibilidade ${Math.round(career.flexibility * 100)}%</p><div class="education career-actions">${careerActions.map((item) => `<article><button data-action="${item.id}" ${item.enabled ? '' : 'disabled'}>${item.label}</button>${item.lockedReason ? `<small>${item.lockedReason}</small>` : ''}</article>`).join('') || '<p>Você alcançou a transição disponível neste arco.</p>'}</div><h3>Mudar de moradia</h3><div class="education housing-actions">${housingActions.map((item) => `<article><button data-action="${item.id}" ${item.enabled ? '' : 'disabled'}>${item.label}</button>${item.lockedReason ? `<small>${item.lockedReason}</small>` : ''}</article>`).join('')}</div><h3>Família e cuidado</h3><p><b>${relationshipStatus}</b><br>${childrenStatus}</p>${family.children.length > 0 ? `<p>Cuidado: ${money(impact.monthlyCareCost)}/mês · ${impact.weeklyCareHours}h/semana · pressão de moradia ${impact.housingPressure} · pressão de tempo ${impact.timePressure}</p>` : ''}<div class="education family-actions">${familyActions.map((item) => `<article><button data-action="${item.id}" ${item.enabled ? '' : 'disabled'}>${item.label}</button>${item.lockedReason ? `<small>${item.lockedReason}</small>` : ''}</article>`).join('') || '<p>Fortaleça vínculos com as pessoas da cidade para abrir novas decisões.</p>'}</div><h3>Deslocamento na garoa</h3><div class="commutes">${estimates.map((estimate) => `<button data-travel-mode="${estimate.mode}" class="${player.preferredTravelMode === estimate.mode ? 'active' : ''}"><b>${modeName[estimate.mode]}</b> ${estimate.minutes} min · ${money(estimate.cost)} · −${estimate.energy} disposição</button>`).join('')}</div><h3>Estudar é possível. O caminho não é igual.</h3>${educationStatus}<div class="education">${education.map((option) => `<article><b>${option.path.name}</b><span>${option.weeklyHoursRequired}h/semana · ${money(option.monthlyCost)}/mês · ${option.path.durationMonths} meses</span><small>${difficulty(option.accessDifficulty)} · dificuldade ${option.accessDifficulty}<br>${option.path.completionDescription}</small>${enrollment?.status === 'active' ? '' : `<button data-education="${option.path.id}">Matricular</button>`}</article>`).join('')}</div><h3>Caderninho</h3>${state!.journal.map((entry) => `<p><b>${entry.kind === 'objective' ? 'Objetivo' : entry.kind === 'contact' ? 'Contato' : 'Aprendi'}</b><br>${entry.text}</p>`).join('') || '<p>A primeira página ainda está em branco.</p>'}<h3>Salvar</h3><div class="slots">${SLOTS.map((slot) => `<button data-slot="${slot}">Slot ${slot}</button>`).join('')}</div><button data-command="menu">Fechar</button></aside>`
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
  ui.querySelector('[data-command="new"]')?.addEventListener('click', () => {
    creatingCharacter = true
    render()
  })
  ui.querySelector('[data-command="back"]')?.addEventListener('click', () => {
    creatingCharacter = false
    selectedArchetype = undefined
    render()
  })
  ui.querySelector('[data-command="back-archetype"]')?.addEventListener('click', () => {
    selectedArchetype = undefined
    render()
  })
  ui.querySelectorAll<HTMLElement>('[data-archetype]').forEach((button) =>
    button.addEventListener('click', () => {
      selectedArchetype = button.dataset.archetype as ArchetypeId
      render()
    })
  )
  ui.querySelectorAll<HTMLElement>('[data-housing]').forEach((button) =>
    button.addEventListener('click', () =>
      start(selectedArchetype ?? 'artista', button.dataset.housing as HousingId)
    )
  )
  ui.querySelector('[data-command="continue"]')?.addEventListener('click', continueGame)
  ui.querySelector('[data-command="sound"]')?.addEventListener('click', () => {
    audio.start()
    audio.toggle()
    render()
  })
  ui.querySelectorAll('[data-command="menu"]').forEach((button) =>
    button.addEventListener('click', () => {
      menuOpen = !menuOpen
      render()
    })
  )
  ui.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach((button) =>
    button.addEventListener('click', () => saveSlot(button.dataset.slot as Slot))
  )
  ui.querySelectorAll<HTMLButtonElement>('[data-travel-mode]').forEach((button) =>
    button.addEventListener('click', () =>
      chooseTravelMode(button.dataset.travelMode as TravelMode)
    )
  )
  ui.querySelectorAll<HTMLButtonElement>('[data-education]').forEach((button) =>
    button.addEventListener('click', () =>
      chooseEducation(button.dataset.education as EducationPathId)
    )
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
  if (state.mode.kind === 'world') {
    if (['ArrowDown', 's', 'ArrowRight', 'd', 'ArrowUp', 'w', 'ArrowLeft', 'a'].includes(event.key))
      audio.cue('footstep')
    return
  }
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
