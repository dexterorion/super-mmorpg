import { SCHEMA_VERSION, type GameState } from '../state/state.js'
import { checksum, decodeText, encodeText } from './codec.js'

/**
 * Save files, versioned and migratable.
 *
 * The game will keep changing while people have saves in their browser, so
 * every load runs the state forward through the migration chain. A save that
 * cannot be migrated is reported, never silently reset — losing four hours of
 * someone's playthrough without a word is the worst bug this module could have.
 */

export const SAVE_KEY_PREFIX = 'garoa.save.'
export const AUTOSAVE_SLOT = 'auto'
export const SLOTS = ['1', '2', '3'] as const
export type Slot = (typeof SLOTS)[number] | typeof AUTOSAVE_SLOT

export interface SaveFile {
  readonly version: number
  readonly savedAt: number
  readonly checksum: string
  readonly state: GameState
}

export interface SaveMeta {
  readonly slot: Slot
  readonly savedAt: number
  readonly playerName: string
  readonly day: number
  readonly act: number
  readonly district: string
  readonly elapsedMinutes: number
}

/** Persistence port. The browser adapter lives in platform/. */
export interface SaveStorage {
  read(key: string): string | null
  write(key: string, value: string): void
  remove(key: string): void
  keys(): readonly string[]
}

export type LoadResult =
  | { readonly ok: true; readonly state: GameState; readonly migrated: boolean }
  | {
      readonly ok: false
      readonly reason: 'missing' | 'corrupt' | 'checksum' | 'unsupportedVersion'
      readonly detail?: string
    }

/**
 * Migrations run in order from the file's version up to SCHEMA_VERSION.
 * Each entry migrates *from* its key version to key + 1.
 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: (raw) => ({
    ...raw,
    player: { ...(raw.player as object), archetype: 'artista' },
  }),
  2: (raw) => ({
    ...raw,
    player: {
      ...(raw.player as object),
      occupation: 'Produção cultural',
      monthlyIncome: 190_000,
      housing: 'pensao_bixiga',
      monthlyRent: 95_000,
    },
  }),
  3: (raw) => ({
    ...raw,
    clock: { ...(raw.clock as object), minuteOfDay: 310 },
  }),
}

export function serialize(state: GameState, now: number): string {
  const body = JSON.stringify(state)
  const file: SaveFile = {
    version: SCHEMA_VERSION,
    savedAt: now,
    checksum: checksum(body),
    state,
  }
  return JSON.stringify(file)
}

export function deserialize(text: string): LoadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { ok: false, reason: 'corrupt', detail: String(error) }
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: 'corrupt', detail: 'not an object' }
  }

  const file = parsed
  if (typeof file.version !== 'number' || !isRecord(file.state)) {
    return { ok: false, reason: 'corrupt', detail: 'missing version or state' }
  }

  if (file.version > SCHEMA_VERSION) {
    return {
      ok: false,
      reason: 'unsupportedVersion',
      detail: `save is v${file.version}, this build understands up to v${SCHEMA_VERSION}`,
    }
  }

  if (file.checksum && checksum(JSON.stringify(file.state)) !== file.checksum) {
    return { ok: false, reason: 'checksum' }
  }

  let raw = file.state
  let version = file.version
  const migrated = version < SCHEMA_VERSION

  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version]
    if (!migration) {
      return {
        ok: false,
        reason: 'unsupportedVersion',
        detail: `no migration from v${version} to v${version + 1}`,
      }
    }
    raw = migration(raw)
    version += 1
  }

  const migratedState = { ...raw, schemaVersion: SCHEMA_VERSION }
  if (!isGameState(migratedState)) {
    return { ok: false, reason: 'corrupt', detail: 'invalid game state shape' }
  }

  return {
    ok: true,
    state: migratedState,
    migrated,
  }
}

// --- Slot management ---------------------------------------------------

function keyFor(slot: Slot): string {
  return `${SAVE_KEY_PREFIX}${slot}`
}

export function save(storage: SaveStorage, slot: Slot, state: GameState, now: number): void {
  storage.write(keyFor(slot), serialize(state, now))
}

export function load(storage: SaveStorage, slot: Slot): LoadResult {
  const text = storage.read(keyFor(slot))
  if (text === null) return { ok: false, reason: 'missing' }
  return deserialize(text)
}

export function remove(storage: SaveStorage, slot: Slot): void {
  storage.remove(keyFor(slot))
}

export function describe(storage: SaveStorage, slot: Slot): SaveMeta | undefined {
  const text = storage.read(keyFor(slot))
  if (text === null) return undefined
  const result = deserialize(text)
  if (!result.ok) return undefined

  let savedAt = 0
  try {
    const parsedMeta: unknown = JSON.parse(text)
    if (isRecord(parsedMeta) && typeof parsedMeta.savedAt === 'number') savedAt = parsedMeta.savedAt
  } catch {
    savedAt = 0
  }

  return {
    slot,
    savedAt,
    playerName: result.state.player.name,
    day: result.state.clock.day,
    act: result.state.act,
    district: result.state.district,
    elapsedMinutes: result.state.elapsedMinutes,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value) || !isRecord(value.player) || !isRecord(value.player.stats)) return false
  if (!isRecord(value.clock) || !isRecord(value.mode)) return false
  return (
    typeof value.schemaVersion === 'number' &&
    typeof value.seed === 'number' &&
    typeof value.rngState === 'number' &&
    typeof value.player.name === 'string' &&
    isOneOf(value.player.hometown, ['prudente', 'bauru', 'barretos']) &&
    isOneOf(value.player.archetype, [
      'pedreiro',
      'faria_limer',
      'artista',
      'entregador',
      'estudante',
      'saude',
    ]) &&
    typeof value.player.occupation === 'string' &&
    typeof value.player.monthlyIncome === 'number' &&
    isOneOf(value.player.housing, [
      'pensao_bixiga',
      'kitnet_centro',
      'apartamento_zona_leste',
      'quarto_guarulhos',
      'studio_copan',
    ]) &&
    typeof value.player.monthlyRent === 'number' &&
    numbers(value.player.stats, ['savvy', 'savvyXp', 'gab', 'instinct', 'grit']) &&
    typeof value.player.money === 'number' &&
    Number.isSafeInteger(value.player.money) &&
    typeof value.player.transit === 'number' &&
    Number.isSafeInteger(value.player.transit) &&
    typeof value.player.energy === 'number' &&
    typeof value.player.energyMax === 'number' &&
    typeof value.clock.day === 'number' &&
    isOneOf(value.clock.period, ['morning', 'afternoon', 'night']) &&
    typeof value.clock.minuteOfDay === 'number' &&
    value.clock.minuteOfDay >= 0 &&
    value.clock.minuteOfDay < 1440 &&
    typeof value.act === 'number' &&
    [1, 2, 3, 4, 5].includes(value.act) &&
    isMode(value.mode) &&
    (value.battle === null || isBattle(value.battle)) &&
    typeof value.district === 'string' &&
    typeof value.place === 'string' &&
    strings(value.visitedDistricts) &&
    recordValues(value.flags, (entry) => ['boolean', 'number', 'string'].includes(typeof entry)) &&
    recordValues(value.quests, isQuestProgress) &&
    arrayValues(value.journal, isJournalEntry) &&
    recordValues(
      value.inventory,
      (entry) => typeof entry === 'number' && Number.isSafeInteger(entry)
    ) &&
    recordValues(value.relationships, (entry) => typeof entry === 'number') &&
    strings(value.seenNodes) &&
    strings(value.clearedDesenrolos) &&
    typeof value.elapsedMinutes === 'number'
  )
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.some((option) => option === value)
}

function numbers(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => typeof record[key] === 'number')
}

function strings(value: unknown): value is string[] {
  return arrayValues(value, (entry) => typeof entry === 'string')
}

function arrayValues(value: unknown, predicate: (entry: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(predicate)
}

function recordValues(
  value: unknown,
  predicate: (entry: unknown) => boolean
): value is Record<string, unknown> {
  return isRecord(value) && Object.values(value).every(predicate)
}

function isMode(value: Record<string, unknown>): boolean {
  switch (value.kind) {
    case 'world':
      return true
    case 'dialogue':
      return (
        typeof value.dialogueId === 'string' &&
        typeof value.nodeId === 'string' &&
        typeof value.lineIndex === 'number' &&
        (value.returnTo === undefined || (isRecord(value.returnTo) && isMode(value.returnTo)))
      )
    case 'desenrolo':
      return typeof value.desenroloId === 'string'
    case 'ended':
      return typeof value.endingId === 'string'
    default:
      return false
  }
}

function isBattle(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    numbers(value, ['patience', 'patienceMax', 'turn', 'revealedTells']) &&
    recordValues(value.topicUses, (entry) => typeof entry === 'number') &&
    typeof value.weaknessRevealed === 'boolean' &&
    strings(value.usedItems) &&
    arrayValues(
      value.transcript,
      (entry) =>
        isRecord(entry) &&
        isOneOf(entry.who, ['player', 'situation', 'narrator']) &&
        typeof entry.text === 'string'
    ) &&
    isOneOf(value.phase, ['intro', 'playing', 'won', 'lost']) &&
    typeof value.braced === 'boolean'
  )
}

function isQuestProgress(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOneOf(value.status, ['active', 'done', 'failed']) &&
    typeof value.step === 'number' &&
    typeof value.startedOnDay === 'number'
  )
}

function isJournalEntry(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.day === 'number' &&
    typeof value.text === 'string' &&
    isOneOf(value.kind, ['objective', 'lesson', 'contact'])
  )
}

export function listSaves(storage: SaveStorage): readonly SaveMeta[] {
  return [AUTOSAVE_SLOT, ...SLOTS]
    .map((slot) => describe(storage, slot as Slot))
    .filter((m): m is SaveMeta => m !== undefined)
}

// --- Export / import ---------------------------------------------------

/** A shareable, pasteable save string — handy for bug reports. */
export function exportSave(state: GameState, now: number): string {
  return encodeText(serialize(state, now))
}

export function importSave(code: string): LoadResult {
  try {
    return deserialize(decodeText(code.trim()))
  } catch (error) {
    return { ok: false, reason: 'corrupt', detail: String(error) }
  }
}

/** In-memory storage, used by tests and by the headless playtest harness. */
export function createMemoryStorage(): SaveStorage {
  const map = new Map<string, string>()
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value)
    },
    remove: (key) => {
      map.delete(key)
    },
    keys: () => [...map.keys()],
  }
}
