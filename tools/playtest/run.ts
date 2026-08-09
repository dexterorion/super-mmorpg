import { mkdir, writeFile } from 'node:fs/promises'
import { content } from '../../src/content/index.js'
import { GameSession, type AvailableAction } from '../../src/core/session.js'
import { createInitialState, type GameState } from '../../src/core/state/state.js'
import { createRng } from '../../src/core/rng/rng.js'

interface RunResult {
  readonly seed: number
  readonly ended: boolean
  readonly steps: number
  readonly path: readonly string[]
  readonly visited: readonly string[]
  readonly ending?: string
  readonly error?: string
}
const args = process.argv.slice(2)
const valueAfter = (flag: string): string | undefined => {
  const index = args.indexOf(flag)
  return index < 0 ? undefined : args[index + 1]
}
const runs = Number(valueAfter('--runs') ?? 1_000)
const requestedSeed = valueAfter('--seed')
const horizonteChoice = valueAfter('--horizonte') === 'entrar' ? 'entrar' : 'recusar'
const valChoice = valueAfter('--val') === 'vai' ? 'vai' : 'fica'
const maxSteps = 500
const session = new GameSession(content)

function scriptedChoice(
  state: GameState,
  actions: readonly AvailableAction[]
): AvailableAction | undefined {
  const enabled = actions.filter((action) => action.enabled)
  const exact = (id: string): AvailableAction | undefined =>
    enabled.find((action) => action.id === id)
  if (state.mode.kind === 'desenrolo' && state.battle?.phase === 'playing') {
    const definition = content.desenrolos[state.battle.id]
    if (state.battle.revealedTells < (definition?.tells.length ?? 0)) {
      return exact('battle:observe')
    }
    const freshArgument = definition?.arguments
      .filter(
        (argument) => !argument.rebutted && (state.battle?.topicUses[argument.topic] ?? 0) === 0
      )
      .sort((left, right) => right.power - left.power)[0]
    if (freshArgument) return exact(`battle:argue:${freshArgument.id}`)
  }
  if (state.place === 'tiete_metro' && state.player.transit > 0) return exact('travel:centro')
  if (state.place === 'centro_anhangabau' && state.flags.knows_bixiga_route === true) {
    return exact('walk:centro_republica')
  }
  if (state.place === 'centro_republica' && state.flags.knows_bixiga_route === true) {
    return exact('travel:bixiga')
  }
  const ids = [
    state.mode.kind === 'dialogue' ? 'advance' : '',
    'choice:prudente',
    'choice:reclamar',
    'battle:begin',
    'battle:argue:seguranca',
    'battle:argue:preco',
    'battle:argue:devolve',
    'battle:argue:entrada',
    'battle:argue:familia',
    'battle:argue:verdade',
    'battle:argue:trabalho',
    'battle:item:cafe',
    'battle:insist',
    'battle:ack',
    'do:ligar_val',
    'walk:tiete_metro',
    'do:comprar_bilhete',
    'walk:centro_anhangabau',
    'talk:seu_jorge',
    'choice:direto',
    'travel:bixiga',
    'walk:bixiga_pensao_porta',
    'choice:pedir',
    'walk:bixiga_quarto',
    'choice:fila',
    'do:enfrentar_fila',
    `choice:${horizonteChoice}`,
    'choice:agua',
    `choice:${valChoice}`,
    'choice:responder',
  ]
  for (const id of ids) {
    const found = enabled.find((action) => action.id === id)
    if (found) return found
  }
  return enabled.find((action) => action.group === 'move') ?? enabled[0]
}

function run(seed: number, policy: 'scripted' | 'monkey'): RunResult {
  let state = session.begin(createInitialState({ name: 'Jaci', hometown: 'prudente', seed })).state
  const path: string[] = []
  const visited = new Set([state.place])
  const rng = createRng(seed ^ 0x9e3779b9)
  try {
    for (let step = 0; step < maxSteps; step += 1) {
      if (state.mode.kind === 'ended')
        return {
          seed,
          ended: true,
          steps: step,
          path,
          visited: [...visited],
          ending: state.mode.endingId,
        }
      const actions = session.availableActions(state)
      const enabled = actions.filter((action) => action.enabled)
      if (enabled.length === 0)
        return {
          seed,
          ended: false,
          steps: step,
          path,
          visited: [...visited],
          error: `softlock at ${state.place}/${state.mode.kind}`,
        }
      const chosen =
        policy === 'scripted'
          ? scriptedChoice(state, enabled)
          : enabled[rng.int(0, enabled.length - 1)]
      if (!chosen)
        return {
          seed,
          ended: false,
          steps: step,
          path,
          visited: [...visited],
          error: 'policy returned no action',
        }
      path.push(chosen.id)
      state = session.perform(state, chosen.action).state
      visited.add(state.place)
    }
    return {
      seed,
      ended: state.mode.kind === 'ended',
      steps: maxSteps,
      path,
      visited: [...visited],
      error: 'step budget exceeded',
    }
  } catch (error) {
    return {
      seed,
      ended: false,
      steps: path.length,
      path,
      visited: [...visited],
      error: String(error),
    }
  }
}

const baseSeed = Number(requestedSeed ?? 1)
const scripted = run(baseSeed, 'scripted')
if (!scripted.ended) {
  console.error(JSON.stringify(scripted, null, 2))
  process.exitCode = 1
} else {
  const results = Array.from({ length: runs }, (_, index) => run(baseSeed + index, 'monkey'))
  const softlocks = results.filter((result) => result.error?.startsWith('softlock'))
  const allVisited = new Set(results.flatMap((result) => result.visited))
  const report = {
    generatedAt: new Date().toISOString(),
    runs,
    scripted: { seed: scripted.seed, steps: scripted.steps, ended: scripted.ended },
    monkey: {
      completed: results.filter((result) => result.ended).length,
      softlocks: softlocks.length,
      maxSteps: Math.max(...results.map((result) => result.steps)),
    },
    coverage: { places: [...allVisited].sort(), placeCount: allVisited.size },
  }
  await mkdir('playtest-report', { recursive: true })
  await writeFile('playtest-report/headless.json', `${JSON.stringify(report, null, 2)}\n`)
  console.warn(
    `GAROA playtest: scripted completed in ${scripted.steps} actions; ${runs} monkey runs; ${softlocks.length} softlocks.`
  )
  if (softlocks.length > 0) {
    console.error(`Reproduce: npm run playtest -- --seed ${softlocks[0]!.seed}`)
    console.error(softlocks[0]!.path.join(' -> '))
    process.exitCode = 1
  }
}
