import { describe, expect, it } from 'vitest'
import { createInitialState, SCHEMA_VERSION } from '../state/state.js'
import { base64ToBytes, bytesToBase64, checksum, decodeText, encodeText } from './codec.js'
import {
  createMemoryStorage,
  deserialize,
  describe as describeSave,
  exportSave,
  importSave,
  listSaves,
  load,
  remove,
  save,
  serialize,
} from './save.js'

const state = createInitialState({ name: 'Ana', hometown: 'prudente', seed: 77 })

describe('validation', () => {
  it('rejects a checksum-valid object that is not a GameState', () => {
    const invalidState = { player: { name: 'Ana' } }
    const text = JSON.stringify({
      version: SCHEMA_VERSION,
      savedAt: 1,
      checksum: checksum(JSON.stringify(invalidState)),
      state: invalidState,
    })
    expect(deserialize(text)).toMatchObject({ ok: false, reason: 'corrupt' })
  })

  it('rejects an otherwise valid state with a required field missing', () => {
    const { act: _act, ...missingAct } = state
    const text = JSON.stringify({
      version: SCHEMA_VERSION,
      savedAt: 1,
      checksum: checksum(JSON.stringify(missingAct)),
      state: missingAct,
    })
    expect(deserialize(text)).toMatchObject({ ok: false, reason: 'corrupt' })
  })
})

describe('codec', () => {
  it('round-trips ASCII', () => {
    expect(decodeText(encodeText('hello'))).toBe('hello')
  })

  it('round-trips Portuguese text, which btoa would reject', () => {
    const text = 'Você não é da cidade, né? Coração, pensão, açaí — 中文 too.'
    expect(decodeText(encodeText(text))).toBe(text)
  })

  it('round-trips every input length, covering both padding cases', () => {
    for (let length = 0; length < 40; length++) {
      const text = 'á'.repeat(length)
      expect(decodeText(encodeText(text))).toBe(text)
    }
  })

  it('round-trips raw bytes', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 254, 255])
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes])
  })

  it('checksum is stable and sensitive to any change', () => {
    expect(checksum('abc')).toBe(checksum('abc'))
    expect(checksum('abc')).not.toBe(checksum('abd'))
  })
})

describe('serialize / deserialize', () => {
  it('round-trips a full game state', () => {
    const result = deserialize(serialize(state, 1000))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state).toEqual(state)
    expect(result.migrated).toBe(false)
  })

  it('migrates a v2 archetype save to the housing model', () => {
    const oldState = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    const oldPlayer = oldState.player as Record<string, unknown>
    delete oldPlayer.occupation
    delete oldPlayer.monthlyIncome
    delete oldPlayer.housing
    delete oldPlayer.monthlyRent
    const result = deserialize(JSON.stringify({ version: 2, savedAt: 1, state: oldState }))
    expect(result).toMatchObject({ ok: true, migrated: true })
    if (!result.ok) return
    expect(result.state.player).toMatchObject({
      occupation: 'Produção cultural',
      housing: 'pensao_bixiga',
      monthlyRent: 95_000,
    })
  })

  it('migrates a v3 save to the minute clock', () => {
    const oldState = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    delete (oldState.clock as Record<string, unknown>).minuteOfDay
    const result = deserialize(JSON.stringify({ version: 3, savedAt: 1, state: oldState }))
    expect(result).toMatchObject({ ok: true, migrated: true })
    if (result.ok) expect(result.state.clock.minuteOfDay).toBe(310)
  })

  it('migrates a v4 save to a preferred travel mode', () => {
    const oldState = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    delete (oldState.player as Record<string, unknown>).preferredTravelMode
    const result = deserialize(JSON.stringify({ version: 4, savedAt: 1, state: oldState }))
    expect(result).toMatchObject({ ok: true, migrated: true })
    if (result.ok) expect(result.state.player.preferredTravelMode).toBe('metro')
  })

  it('migrates a v5 save through education and family models', () => {
    const oldState = JSON.parse(JSON.stringify(state)) as Record<string, unknown>
    delete oldState.education
    delete oldState.family
    const result = deserialize(JSON.stringify({ version: 5, savedAt: 1, state: oldState }))
    expect(result).toMatchObject({ ok: true, migrated: true })
    if (result.ok) {
      expect(result.state.education).toBeNull()
      expect(result.state.family).toEqual({
        partnership: null,
        childrenDecision: 'undecided',
        children: [],
      })
    }
  })

  it('reports unparseable text as corrupt instead of throwing', () => {
    const result = deserialize('{{{not json')
    expect(result).toMatchObject({ ok: false, reason: 'corrupt' })
  })

  it('rejects JSON that is not a save file', () => {
    expect(deserialize('42')).toMatchObject({ ok: false, reason: 'corrupt' })
    expect(deserialize('null')).toMatchObject({ ok: false, reason: 'corrupt' })
    expect(deserialize('{"version":1}')).toMatchObject({ ok: false, reason: 'corrupt' })
  })

  it('detects a tampered or truncated payload via the checksum', () => {
    const text = serialize(state, 1000)
    const tampered = text.replace('"money":34000', '"money":99999999')
    expect(deserialize(tampered)).toMatchObject({ ok: false, reason: 'checksum' })
  })

  it('refuses a save written by a newer build rather than mangling it', () => {
    const file = JSON.parse(serialize(state, 1000)) as Record<string, unknown>
    file.version = SCHEMA_VERSION + 5
    const result = deserialize(JSON.stringify(file))
    expect(result).toMatchObject({ ok: false, reason: 'unsupportedVersion' })
  })

  it('reports a missing migration instead of silently dropping the save', () => {
    const file = JSON.parse(serialize(state, 1000)) as Record<string, unknown>
    file.version = 0
    delete file.checksum
    const result = deserialize(JSON.stringify(file))
    expect(result).toMatchObject({ ok: false, reason: 'unsupportedVersion' })
    if (result.ok) return
    expect(result.detail).toContain('no migration')
  })
})

describe('slots', () => {
  it('saves, lists, loads and removes', () => {
    const storage = createMemoryStorage()
    save(storage, '1', state, 1234)

    expect(describeSave(storage, '1')).toMatchObject({
      slot: '1',
      playerName: 'Ana',
      day: 1,
      act: 1,
      savedAt: 1234,
    })

    const loaded = load(storage, '1')
    expect(loaded.ok).toBe(true)

    expect(listSaves(storage)).toHaveLength(1)

    remove(storage, '1')
    expect(load(storage, '1')).toMatchObject({ ok: false, reason: 'missing' })
    expect(listSaves(storage)).toHaveLength(0)
  })

  it('keeps autosave and manual slots apart', () => {
    const storage = createMemoryStorage()
    save(storage, 'auto', state, 1)
    save(storage, '2', { ...state, act: 3 }, 2)

    expect(describeSave(storage, 'auto')?.act).toBe(1)
    expect(describeSave(storage, '2')?.act).toBe(3)
    expect(listSaves(storage)).toHaveLength(2)
  })

  it('does not describe a corrupt slot', () => {
    const storage = createMemoryStorage()
    storage.write('garoa.save.1', 'garbage')
    expect(describeSave(storage, '1')).toBeUndefined()
  })
})

describe('export / import', () => {
  it('round-trips through a pasteable code', () => {
    const code = exportSave(state, 999)
    const result = importSave(code)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state).toEqual(state)
  })

  it('tolerates whitespace a user pasted in', () => {
    const code = exportSave(state, 999)
    expect(importSave(`  ${code}\n`).ok).toBe(true)
  })

  it('reports garbage instead of throwing', () => {
    expect(importSave('not-a-save').ok).toBe(false)
  })
})
