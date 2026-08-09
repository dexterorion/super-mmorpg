import { describe, expect, it } from 'vitest'
import { scoreFrequencies } from './audio.js'

describe('procedural score', () => {
  it('gives each district a stable musical identity', () => {
    const tiete = scoreFrequencies({ district: 'tiete', period: 'morning', mode: 'world' })
    const liberdade = scoreFrequencies({ district: 'liberdade', period: 'morning', mode: 'world' })
    expect(tiete).toHaveLength(3)
    expect(liberdade).not.toEqual(tiete)
  })

  it('shifts the harmony with period and tension', () => {
    const day = scoreFrequencies({ district: 'centro', period: 'morning', mode: 'world' })
    const night = scoreFrequencies({ district: 'centro', period: 'night', mode: 'world' })
    const battle = scoreFrequencies({ district: 'centro', period: 'morning', mode: 'desenrolo' })
    expect(night[0]).toBeLessThan(day[0]!)
    expect(battle[0]).toBeGreaterThan(day[0]!)
  })
})
