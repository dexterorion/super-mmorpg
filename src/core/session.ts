import type {
  DesenroloId,
  DialogueId,
  DistrictId,
  GameEvent,
  ItemId,
  NpcId,
  PlaceId,
} from './types.js'
import type { Dialogue } from './dialogue/dialogue.js'
import type { DesenroloAction, DesenroloDef } from './desenrolo/desenrolo.js'
import type { ItemDef } from './items/item.js'
import type { DistrictDef, NpcDef, PlaceDef } from './world/world.js'
import { DEFAULT_WALK_COST } from './world/world.js'
import { describeUnmet, evaluate, evaluateAll } from './rules/conditions.js'
import { applyEffects } from './rules/effects.js'
import * as dialogue from './dialogue/dialogue.js'
import * as desenrolo from './desenrolo/desenrolo.js'
import {
  advanceMinutes,
  advancePeriod,
  canRide,
  isExhausted,
  payFare,
  spendEnergy,
} from './economy/economy.js'
import { isFlagTrue, withFlag, type GameState } from './state/state.js'
import { estimateCommute, type TravelMode } from './life/commute.js'
import { advanceEducation } from './life/education.js'
import { applyDueConjuncture } from './life/conjuncture.js'
import {
  agenda,
  canSchedule,
  closeDay,
  hasScheduled,
  scheduleActivity,
  type AgendaActivity,
} from './life/calendar.js'
import {
  advanceFamily,
  assessFamilyImpact,
  beginPartnership,
  decideChildren,
  endPartnership,
  marryPartner,
  welcomeChild,
  type ChildrenDecision,
} from './life/family.js'

/**
 * The one surface everything drives the game through.
 *
 * Phaser renders whatever `availableActions()` returns and calls `perform()`;
 * the headless playtest bot does exactly the same thing with no browser in
 * sight. Because there is only one path, a bug the bot finds is a bug the
 * player would have hit — they are not two implementations that can drift.
 */

export interface ContentBundle {
  readonly districts: Readonly<Record<DistrictId, DistrictDef>>
  readonly places: Readonly<Record<PlaceId, PlaceDef>>
  readonly npcs: Readonly<Record<NpcId, NpcDef>>
  readonly dialogues: Readonly<Record<DialogueId, Dialogue>>
  readonly desenrolos: Readonly<Record<DesenroloId, DesenroloDef>>
  readonly items: Readonly<Record<ItemId, ItemDef>>
}

export type Action =
  | { readonly kind: 'advance' }
  | { readonly kind: 'choose'; readonly choiceId: string }
  | { readonly kind: 'walk'; readonly to: PlaceId }
  | { readonly kind: 'travel'; readonly to: DistrictId }
  | { readonly kind: 'talk'; readonly npcId: NpcId }
  | { readonly kind: 'placeAction'; readonly actionId: string }
  | { readonly kind: 'battle'; readonly move: DesenroloAction }
  | { readonly kind: 'useItem'; readonly itemId: ItemId }
  | {
      readonly kind: 'agenda'
      readonly decision:
        | { readonly kind: 'activity'; readonly activity: AgendaActivity }
        | { readonly kind: 'closeDay' }
    }
  | {
      readonly kind: 'family'
      readonly decision:
        | { readonly kind: 'beginPartnership'; readonly partnerNpcId: NpcId }
        | { readonly kind: 'marry' }
        | { readonly kind: 'separate' }
        | { readonly kind: 'decideChildren'; readonly value: ChildrenDecision }
        | { readonly kind: 'welcomeChild' }
        | { readonly kind: 'careDay' }
    }

export interface AvailableAction {
  /** Stable across runs — the bot's vocabulary and the UI's key. */
  readonly id: string
  readonly label: string
  readonly action: Action
  readonly enabled: boolean
  readonly lockedReason?: string
  /** Grouping hint for the UI. */
  readonly group: 'dialogue' | 'move' | 'people' | 'act' | 'battle' | 'item' | 'life' | 'agenda'
}

export interface PerformResult {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}

/** Rough real-time cost of each action, used only for pacing analysis. */
const SECONDS_PER_ACTION: Record<Action['kind'], number> = {
  advance: 4,
  choose: 9,
  walk: 6,
  travel: 10,
  talk: 3,
  placeAction: 6,
  battle: 7,
  useItem: 4,
  family: 9,
  agenda: 5,
}

const TRAVEL_MODE_LABEL: Readonly<Record<TravelMode, string>> = {
  walk: 'A pé',
  bike: 'Bike',
  bus: 'Busão',
  metro: 'Metrô',
}

function commuteFor(state: GameState) {
  const hour = Math.floor(state.clock.minuteOfDay / 60)
  return estimateCommute(state.player.preferredTravelMode, {
    referenceMinutes: 45,
    peak: (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20),
    raining: true,
  })
}

export class GameSession {
  constructor(private readonly content: ContentBundle) {}

  /** Reconciles a freshly created or loaded state before either driver renders it. */
  begin(state: GameState): PerformResult {
    return { state: this.reconcile(advanceFamily(advanceEducation(state)), true), events: [] }
  }

  // --- Lookups (bound so they can be passed as ports) -------------------

  readonly dialogueLookup = (id: DialogueId): Dialogue | undefined => this.content.dialogues[id]
  readonly desenroloLookup = (id: DesenroloId): DesenroloDef | undefined =>
    this.content.desenrolos[id]
  readonly itemLookup = (id: ItemId): ItemDef | undefined => this.content.items[id]
  readonly placeLookup = (id: PlaceId): PlaceDef | undefined => this.content.places[id]
  readonly districtLookup = (id: DistrictId): DistrictDef | undefined => this.content.districts[id]
  readonly npcLookup = (id: NpcId): NpcDef | undefined => this.content.npcs[id]

  // --- What can the player do right now? --------------------------------

  availableActions(state: GameState): readonly AvailableAction[] {
    switch (state.mode.kind) {
      case 'dialogue':
        return this.dialogueActions(state)
      case 'desenrolo':
        return this.battleActions(state)
      case 'world':
        return this.worldActions(state)
      case 'ended':
        return []
    }
  }

  private dialogueActions(state: GameState): readonly AvailableAction[] {
    const view = dialogue.getView(state, this.dialogueLookup)
    if (!view) return []

    if (view.canAdvance) {
      return [
        {
          id: 'advance',
          label: view.lineIndex < view.lineCount - 1 ? 'Continuar' : 'Continuar',
          action: { kind: 'advance' },
          enabled: true,
          group: 'dialogue',
        },
      ]
    }

    return view.choices.map((choice) => ({
      id: `choice:${choice.id}`,
      label: choice.check
        ? `${choice.text} [${affinityLabel(choice.check.affinity)} ${Math.round(choice.check.odds * 100)}%]`
        : choice.text,
      action: { kind: 'choose', choiceId: choice.id },
      enabled: choice.enabled,
      ...(choice.lockedReason ? { lockedReason: choice.lockedReason } : {}),
      group: 'dialogue' as const,
    }))
  }

  private battleActions(state: GameState): readonly AvailableAction[] {
    const view = desenrolo.getView(state, this.desenroloLookup)
    if (!view) return []

    if (view.phase === 'intro') {
      return [
        {
          id: 'battle:begin',
          label: 'Encarar',
          action: { kind: 'battle', move: { kind: 'beginFight' } },
          enabled: true,
          group: 'battle',
        },
      ]
    }

    if (view.phase === 'won' || view.phase === 'lost') {
      return [
        {
          id: 'battle:ack',
          label: 'Continuar',
          action: { kind: 'battle', move: { kind: 'acknowledge' } },
          enabled: true,
          group: 'battle',
        },
      ]
    }

    const actions: AvailableAction[] = view.arguments.map((arg) => ({
      id: `battle:argue:${arg.id}`,
      label: `Argumentar — ${arg.text}`,
      action: { kind: 'battle', move: { kind: 'argue', argumentId: arg.id } },
      enabled: arg.enabled,
      group: 'battle' as const,
    }))

    actions.push({
      id: 'battle:observe',
      label: view.canObserve ? 'Observar' : 'Observar (já entendeu tudo)',
      action: { kind: 'battle', move: { kind: 'observe' } },
      enabled: view.canObserve,
      ...(!view.canObserve ? { lockedReason: 'já entendeu tudo' } : {}),
      group: 'battle',
    })

    actions.push({
      id: 'battle:insist',
      label: 'Insistir',
      action: { kind: 'battle', move: { kind: 'insist' } },
      enabled: true,
      group: 'battle',
    })

    for (const [itemId, count] of Object.entries(state.inventory)) {
      const def = this.content.items[itemId]
      if (!def?.battle || count < 1) continue
      const spent = state.battle?.usedItems.includes(itemId) === true && def.battle.oncePerBattle
      actions.push({
        id: `battle:item:${itemId}`,
        label: `Usar ${def.name}`,
        action: { kind: 'battle', move: { kind: 'item', itemId } },
        enabled: !spent,
        ...(spent ? { lockedReason: 'já usou' } : {}),
        group: 'item',
      })
    }

    return actions
  }

  private familyActions(state: GameState): readonly AvailableAction[] {
    const partnership = state.family.partnership
    if (!partnership) {
      return Object.entries(state.relationships)
        .filter(([npcId, affinity]) => affinity >= 2 && this.content.npcs[npcId])
        .map(([npcId]) => ({
          id: `family:partner:${npcId}`,
          label: `Construir uma parceria com ${this.content.npcs[npcId]!.name} · 2h`,
          action: {
            kind: 'family' as const,
            decision: { kind: 'beginPartnership' as const, partnerNpcId: npcId },
          },
          enabled: state.player.energy >= 4,
          ...(state.player.energy >= 4 ? {} : { lockedReason: 'sem disposição' }),
          group: 'life' as const,
        }))
    }

    const actions: AvailableAction[] = []
    if (partnership.status === 'partnered') {
      const daysTogether = state.clock.day - partnership.startedOnDay
      const ready = daysTogether >= 30
      const affordable = state.player.money >= 60_000
      const rested = state.player.energy >= 8
      actions.push({
        id: 'family:marry',
        label: 'Casar no civil · R$ 600,00 · 6h',
        action: { kind: 'family', decision: { kind: 'marry' } },
        enabled: ready && affordable && rested,
        ...(!ready
          ? { lockedReason: `a parceria tem ${daysTogether}/30 dias` }
          : !affordable
            ? { lockedReason: 'grana insuficiente' }
            : !rested
              ? { lockedReason: 'sem disposição' }
              : {}),
        group: 'life',
      })
    }

    actions.push({
      id: 'family:separate',
      label: `Encerrar ${partnership.status === 'married' ? 'o casamento' : 'a parceria'} · 3h`,
      action: { kind: 'family', decision: { kind: 'separate' } },
      enabled: state.player.energy >= 4,
      ...(state.player.energy >= 4 ? {} : { lockedReason: 'sem disposição' }),
      group: 'life',
    })

    if (state.family.childrenDecision === 'undecided') {
      for (const value of ['yes', 'no'] as const) {
        actions.push({
          id: `family:children:${value}`,
          label:
            value === 'yes'
              ? 'Conversar: queremos ter filhos · 1h'
              : 'Conversar: não queremos ter filhos · 1h',
          action: { kind: 'family', decision: { kind: 'decideChildren', value } },
          enabled: true,
          group: 'life',
        })
      }
    }

    if (state.family.childrenDecision === 'yes' && state.family.children.length === 0) {
      const affordable = state.player.money >= 25_000
      const rested = state.player.energy >= 8
      actions.push({
        id: 'family:welcome-child',
        label: 'Acolher uma criança · R$ 250,00 · 4h',
        action: { kind: 'family', decision: { kind: 'welcomeChild' } },
        enabled: affordable && rested,
        ...(!affordable
          ? { lockedReason: 'grana insuficiente para os primeiros cuidados' }
          : !rested
            ? { lockedReason: 'sem disposição' }
            : {}),
        group: 'life',
      })
    }

    if (state.family.children.length > 0 && !isFlagTrue(state, `family:care:${state.clock.day}`)) {
      const impact = this.familyImpact(state)
      const dailyCost = Math.ceil(impact.monthlyCareCost / 30)
      const careMinutes = Math.ceil((impact.weeklyCareHours * 60) / 7)
      actions.push({
        id: 'family:care-day',
        label: `Assumir o cuidado de hoje · ${formatMoney(dailyCost)} · ${formatDuration(careMinutes)}`,
        action: { kind: 'family', decision: { kind: 'careDay' } },
        enabled: state.player.money >= dailyCost && state.player.energy >= 6,
        ...(state.player.money < dailyCost
          ? { lockedReason: 'grana insuficiente' }
          : state.player.energy < 6
            ? { lockedReason: 'sem disposição' }
            : {}),
        group: 'life',
      })
    }
    return actions
  }

  private agendaActions(state: GameState): readonly AvailableAction[] {
    const actions: AvailableAction[] = (Object.keys(agenda) as AgendaActivity[]).map((activity) => {
      const available = canSchedule(state, activity)
      const alreadyDone = hasScheduled(state, activity)
      return {
        id: `agenda:${activity}`,
        label: `${agenda[activity].label} · ${formatDuration(agenda[activity].minutes)}`,
        action: { kind: 'agenda', decision: { kind: 'activity', activity } },
        enabled: available,
        ...(available
          ? {}
          : {
              lockedReason:
                activity === 'study' && state.education?.status !== 'active'
                  ? 'matrícula necessária'
                  : alreadyDone
                    ? 'já feito hoje'
                    : 'sem disposição',
            }),
        group: 'agenda',
      }
    })
    actions.push({
      id: 'agenda:close-day',
      label: 'Encerrar o dia',
      action: { kind: 'agenda', decision: { kind: 'closeDay' } },
      enabled: true,
      group: 'agenda',
    })
    return actions
  }

  familyImpact(state: GameState) {
    const comfortByHousing: Record<string, number> = {
      pensao_bixiga: 2,
      kitnet_centro: 3,
      apartamento_zona_leste: 4,
      quarto_guarulhos: 2,
      studio_copan: 4,
    }
    const workHoursByArchetype: Record<string, number> = {
      pedreiro: 48,
      faria_limer: 52,
      artista: 38,
      entregador: 50,
      estudante: 24,
      saude: 48,
    }
    return assessFamilyImpact({
      family: state.family,
      housing: state.player.housing,
      housingComfort: comfortByHousing[state.player.housing] ?? 2,
      monthlyHouseholdIncome: state.player.monthlyIncome,
      weeklyWorkHours: workHoursByArchetype[state.player.archetype] ?? 40,
      commuteMinutesPerDay: commuteFor(state).minutes * 2,
    })
  }

  private worldActions(state: GameState): readonly AvailableAction[] {
    const place = this.content.places[state.place]
    if (!place) return []

    const actions: AvailableAction[] = []

    // People first: talking is the main verb of this game.
    for (const presence of place.npcs ?? []) {
      if (!evaluateAll(state, presence.conditions)) continue
      const npc = this.content.npcs[presence.npcId]
      actions.push({
        id: `talk:${presence.npcId}`,
        label: presence.label ?? `Falar com ${npc?.name ?? presence.npcId}`,
        action: { kind: 'talk', npcId: presence.npcId },
        enabled: true,
        group: 'people',
      })
    }

    for (const placeAction of place.actions ?? []) {
      const onceKey = `once:${place.id}:${placeAction.id}`
      if (placeAction.once && isFlagTrue(state, onceKey)) continue

      const conditionsMet = evaluateAll(state, placeAction.conditions)
      const unmet = placeAction.conditions?.find((c) => !evaluate(state, c))
      const affordable = state.player.energy >= (placeAction.energyCost ?? 0)
      const enabled = conditionsMet && affordable

      actions.push({
        id: `do:${placeAction.id}`,
        label: placeAction.label,
        action: { kind: 'placeAction', actionId: placeAction.id },
        enabled,
        ...(enabled
          ? {}
          : {
              lockedReason: !affordable
                ? 'sem disposição'
                : unmet
                  ? describeUnmet(unmet)
                  : 'ainda não',
            }),
        group: 'act',
      })
    }

    for (const exit of place.exits) {
      const target = this.content.places[exit.to]
      const conditionsMet = evaluateAll(state, exit.conditions)
      const unmet = exit.conditions?.find((c) => !evaluate(state, c))
      actions.push({
        id: `walk:${exit.to}`,
        label: exit.label || `Ir para ${target?.name ?? exit.to}`,
        action: { kind: 'walk', to: exit.to },
        enabled: conditionsMet,
        ...(conditionsMet ? {} : { lockedReason: unmet ? describeUnmet(unmet) : 'fechado' }),
        group: 'move',
      })
    }

    if (place.station) {
      const district = this.content.districts[state.district]
      for (const targetId of district?.connections ?? []) {
        const target = this.content.districts[targetId]
        if (!target) continue
        const unlocked = evaluateAll(state, target.unlockedBy)
        const commute = commuteFor(state)
        const needsCredit = commute.mode === 'bus' || commute.mode === 'metro'
        const affordable = !needsCredit || canRide(state, commute.cost)
        const rested = state.player.energy >= commute.energy
        const enabled = unlocked && affordable && rested
        actions.push({
          id: `travel:${targetId}`,
          label: `${TRAVEL_MODE_LABEL[commute.mode]} · ${commute.minutes} min → ${target.name}`,
          action: { kind: 'travel', to: targetId },
          enabled,
          ...(enabled
            ? {}
            : {
                lockedReason: !affordable
                  ? 'sem crédito no Bilhete'
                  : !rested
                    ? 'sem disposição para o trajeto'
                    : 'você ainda não sabe chegar lá',
              }),
          group: 'move',
        })
      }
    }

    for (const [itemId, count] of Object.entries(state.inventory)) {
      const def = this.content.items[itemId]
      if (!def?.useEffects || count < 1) continue
      actions.push({
        id: `use:${itemId}`,
        label: `Usar ${def.name}`,
        action: { kind: 'useItem', itemId },
        enabled: true,
        group: 'item',
      })
    }

    actions.push(...this.familyActions(state))
    actions.push(...this.agendaActions(state))

    return actions
  }

  // --- Doing it ----------------------------------------------------------

  perform(state: GameState, action: Action): PerformResult {
    const result = this.dispatch(state, action)
    if (result.state === state && result.events.length === 0) return result
    const withTime: GameState = {
      ...result.state,
      elapsedMinutes: result.state.elapsedMinutes + SECONDS_PER_ACTION[action.kind] / 60,
    }
    const withLifeProgress = advanceFamily(advanceEducation(withTime))
    const reconciled = this.reconcile(withLifeProgress, result.state.place !== state.place)
    const conjuncture = applyDueConjuncture(reconciled)
    return { state: conjuncture.state, events: [...result.events, ...conjuncture.events] }
  }

  /** Convenience for the bot and for tests: perform by the action's stable id. */
  performById(state: GameState, id: string): PerformResult {
    const found = this.availableActions(state).find((a) => a.id === id && a.enabled)
    if (!found) return { state, events: [] }
    return this.perform(state, found.action)
  }

  private dispatch(state: GameState, action: Action): PerformResult {
    switch (action.kind) {
      case 'advance':
        return dialogue.advance(state, this.dialogueLookup)

      case 'choose':
        return dialogue.choose(state, this.dialogueLookup, action.choiceId)

      case 'battle':
        return desenrolo.perform(state, action.move, this.desenroloLookup, this.itemLookup)

      case 'talk': {
        const place = this.content.places[state.place]
        const presence = place?.npcs?.find(
          (n) => n.npcId === action.npcId && evaluateAll(state, n.conditions)
        )
        if (!presence) return { state, events: [] }
        const def = this.content.dialogues[presence.dialogueId]
        if (!def)
          throw new Error(`Missing dialogue "${presence.dialogueId}" for NPC ${action.npcId}`)
        return dialogue.startDialogue(state, def)
      }

      case 'walk': {
        const place = this.content.places[state.place]
        const exit = place?.exits.find((e) => e.to === action.to)
        if (!exit || !evaluateAll(state, exit.conditions)) return { state, events: [] }
        const target = this.content.places[action.to]
        if (!target) throw new Error(`Exit points at missing place "${action.to}"`)

        let next = spendEnergy(state, exit.energyCost ?? DEFAULT_WALK_COST)
        next = advanceMinutes(next, 12)
        if (exit.advancesPeriod) next = advancePeriod(next)
        next = { ...next, place: target.id, district: target.district }
        return { state: next, events: [{ type: 'moved', place: target.id }] }
      }

      case 'travel': {
        const place = this.content.places[state.place]
        if (!place?.station) return { state, events: [] }
        const target = this.content.districts[action.to]
        const currentDistrict = this.content.districts[state.district]
        if (!currentDistrict?.connections.includes(action.to)) return { state, events: [] }
        if (!target || !evaluateAll(state, target.unlockedBy)) return { state, events: [] }
        const commute = commuteFor(state)
        const needsCredit = commute.mode === 'bus' || commute.mode === 'metro'
        if (needsCredit && !canRide(state, commute.cost)) return { state, events: [] }
        if (state.player.energy < commute.energy) return { state, events: [] }

        const stationId = target.places.find((p) => this.content.places[p]?.station)
        const arrival = stationId ?? target.places[0]
        if (!arrival) throw new Error(`District "${action.to}" has no places`)

        let next = needsCredit ? payFare(state, commute.cost) : state
        next = spendEnergy(next, commute.energy)
        next = advanceMinutes(next, commute.minutes)
        next = {
          ...next,
          district: target.id,
          place: arrival,
          visitedDistricts: next.visitedDistricts.includes(target.id)
            ? next.visitedDistricts
            : [...next.visitedDistricts, target.id],
        }
        return { state: next, events: [{ type: 'traveled', district: target.id }] }
      }

      case 'placeAction': {
        const place = this.content.places[state.place]
        const placeAction = place?.actions?.find((a) => a.id === action.actionId)
        if (!place || !placeAction) return { state, events: [] }
        if (!evaluateAll(state, placeAction.conditions)) return { state, events: [] }
        if (state.player.energy < (placeAction.energyCost ?? 0)) return { state, events: [] }

        let next = spendEnergy(state, placeAction.energyCost ?? 0)
        if (placeAction.once) next = withFlag(next, `once:${place.id}:${placeAction.id}`, true)
        const applied = applyEffects(next, placeAction.effects)
        next = applied.state
        if (placeAction.advancesPeriod) next = advancePeriod(next)
        return { state: next, events: applied.events }
      }

      case 'useItem': {
        const def = this.content.items[action.itemId]
        if (!def?.useEffects) return { state, events: [] }
        if ((state.inventory[action.itemId] ?? 0) < 1) return { state, events: [] }
        const applied = applyEffects(state, def.useEffects)
        const consumed =
          def.consumable !== false && !def.key
            ? {
                ...applied.state,
                inventory: consume(applied.state.inventory, action.itemId),
              }
            : applied.state
        return { state: consumed, events: applied.events }
      }

      case 'family':
        return this.performFamily(state, action.decision)
      case 'agenda':
        return action.decision.kind === 'closeDay'
          ? closeDay(state)
          : scheduleActivity(state, action.decision.activity)
    }
  }

  private performFamily(
    state: GameState,
    decision: Extract<Action, { kind: 'family' }>['decision']
  ): PerformResult {
    const available = this.familyActions(state).find((candidate) => {
      const candidateDecision = (candidate.action as Extract<Action, { kind: 'family' }>).decision
      return (
        candidate.enabled &&
        candidateDecision.kind === decision.kind &&
        (decision.kind !== 'beginPartnership' ||
          (candidateDecision.kind === 'beginPartnership' &&
            candidateDecision.partnerNpcId === decision.partnerNpcId)) &&
        (decision.kind !== 'decideChildren' ||
          (candidateDecision.kind === 'decideChildren' &&
            candidateDecision.value === decision.value))
      )
    })
    if (!available) return { state, events: [] }

    switch (decision.kind) {
      case 'beginPartnership': {
        const next = advanceMinutes(
          spendEnergy(beginPartnership(state, decision.partnerNpcId), 4),
          120
        )
        return {
          state: next,
          events: [{ type: 'familyPartnership', partnerNpcId: decision.partnerNpcId }],
        }
      }
      case 'marry': {
        const married = marryPartner(state)
        const next = advanceMinutes(spendEnergy(withMoney(married, -60_000), 8), 360)
        return { state: next, events: [{ type: 'familyMarriage' }] }
      }
      case 'separate': {
        const partner = state.family.partnership
        if (!partner) return { state, events: [] }
        let next = endPartnership(state)
        next = withFlag(next, `family:separated:${partner.partnerNpcId}:${state.clock.day}`, true)
        next = advanceMinutes(spendEnergy(next, 4), 180)
        return {
          state: next,
          events: [{ type: 'familySeparation', partnerNpcId: partner.partnerNpcId }],
        }
      }
      case 'decideChildren':
        return {
          state: advanceMinutes(decideChildren(state, decision.value), 60),
          events: [{ type: 'familyChildrenDecision', decision: decision.value }],
        }
      case 'welcomeChild': {
        const parent = welcomeChild(state, { id: `child-${state.clock.day}`, name: 'Luz' })
        const next = advanceMinutes(spendEnergy(withMoney(parent, -25_000), 8), 240)
        return {
          state: next,
          events: [{ type: 'familyChildWelcomed', childId: `child-${state.clock.day}` }],
        }
      }
      case 'careDay': {
        const impact = this.familyImpact(state)
        const dailyCost = Math.ceil(impact.monthlyCareCost / 30)
        const careMinutes = Math.ceil((impact.weeklyCareHours * 60) / 7)
        let next = withFlag(state, `family:care:${state.clock.day}`, true)
        next = withMoney(next, -dailyCost)
        next = spendEnergy(next, 6)
        next = advanceMinutes(next, careMinutes)
        return {
          state: next,
          events: [{ type: 'familyCare', cost: dailyCost, minutes: careMinutes }],
        }
      }
    }
  }

  /**
   * Keeps derived state honest after every action: starts a Desenrolo whose
   * mode was set by an effect, and makes sure an exhausted player is never
   * left with nothing to do.
   */
  private reconcile(state: GameState, checkArrival = false): GameState {
    let next = state
    let arrivalPending = checkArrival

    for (let iteration = 0; iteration < 8; iteration += 1) {
      if (next.mode.kind === 'desenrolo') {
        const id = next.mode.desenroloId
        if (next.battle?.id !== id) {
          const def = this.content.desenrolos[id]
          if (!def) throw new Error(`Missing Desenrolo "${id}"`)
          next = desenrolo.startBattle(next, def)
        }
        break
      }

      if (next.battle) {
        // Left the fight by any route (an effect, an ending): drop the runtime state.
        next = { ...next, battle: null }
      }

      if (next.mode.kind !== 'world' || !arrivalPending) break

      const place = this.content.places[next.place]
      const trigger = place?.onEnter?.find((candidate) => {
        if (!evaluateAll(next, candidate.conditions)) return false
        const onceKey = `entered:${place.id}:${candidate.dialogueId}`
        return candidate.once === false || !isFlagTrue(next, onceKey)
      })

      if (!place || !trigger) break

      const def = this.content.dialogues[trigger.dialogueId]
      if (!def) throw new Error(`Missing dialogue "${trigger.dialogueId}" for place ${place.id}`)

      if (trigger.once !== false) {
        next = withFlag(next, `entered:${place.id}:${trigger.dialogueId}`, true)
      }
      const previousPlace = next.place
      next = dialogue.startDialogue(next, def).state

      // A regular scene now owns control. Only loop when its entry effects
      // immediately returned to the world (possibly at another place).
      if (next.mode.kind !== 'world') break
      arrivalPending = next.place !== previousPlace
      if (!arrivalPending) break

      if (iteration === 7) {
        throw new Error('Arrival trigger loop exceeded 8 iterations')
      }
    }

    // Running out of Disposição in the world ends the day; it is a setback,
    // not a game over, so the player always wakes up able to act.
    if (next.mode.kind === 'world' && isExhausted(next)) {
      next = {
        ...next,
        clock: { day: next.clock.day + 1, period: 'morning', minuteOfDay: 420 },
        player: { ...next.player, energy: Math.round(next.player.energyMax * 0.6) },
        journal: next.journal,
      }
      next = advanceEducation(next)
      next = advanceFamily(next)
    }

    return next
  }
}

function consume(inventory: Readonly<Record<ItemId, number>>, id: ItemId): Record<ItemId, number> {
  const next = { ...inventory }
  const count = (next[id] ?? 0) - 1
  if (count <= 0) delete next[id]
  else next[id] = count
  return next
}

function withMoney(state: GameState, delta: number): GameState {
  return { ...state, player: { ...state.player, money: state.player.money + delta } }
}

function formatMoney(value: number): string {
  return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`
}

function affinityLabel(affinity: 'gab' | 'instinct' | 'grit'): string {
  return { gab: 'Lábia', instinct: 'Faro', grit: 'Fôlego' }[affinity]
}
