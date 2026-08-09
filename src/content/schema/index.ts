import { z } from 'zod'

const id = z.string().min(1)
const conditionSchema: z.ZodType = z.lazy(() => z.object({ kind: id }).passthrough())
const effectSchema = z.object({ kind: id }).passthrough()

export const npcSchema = z
  .object({ id, name: id, sprite: id.optional(), color: id.optional() })
  .strict()

export const itemSchema = z
  .object({
    id,
    name: id,
    description: id,
    price: z.number().int().nonnegative().optional(),
    key: z.boolean().optional(),
    useEffects: z.array(effectSchema).optional(),
    battle: z
      .object({
        text: id,
        patienceDamage: z.number().optional(),
        energyRestore: z.number().optional(),
        oncePerBattle: z.boolean().optional(),
      })
      .strict()
      .optional(),
    consumable: z.boolean().optional(),
  })
  .strict()

const choiceSchema = z
  .object({
    id,
    text: id,
    conditions: z.array(conditionSchema).optional(),
    hideWhenLocked: z.boolean().optional(),
    effects: z.array(effectSchema).optional(),
    next: id.optional(),
    check: z
      .object({
        affinity: z.enum(['gab', 'instinct', 'grit']),
        difficulty: z.number().int(),
        success: id,
        failure: id,
      })
      .strict()
      .optional(),
    exit: z.boolean().optional(),
  })
  .strict()

const nodeSchema = z
  .object({
    id,
    speaker: id.optional(),
    lines: z.array(z.string()),
    conditions: z.array(conditionSchema).optional(),
    fallback: id.optional(),
    onEnter: z.array(effectSchema).optional(),
    choices: z.array(choiceSchema).optional(),
    next: id.optional(),
    end: z.boolean().optional(),
  })
  .strict()

export const dialogueSchema = z.object({ id, start: id, nodes: z.record(nodeSchema) }).strict()

export const desenroloSchema = z
  .object({
    id,
    name: id,
    subtitle: id.optional(),
    intro: z.array(z.string()),
    patience: z.number().positive(),
    arguments: z.array(
      z
        .object({
          id,
          text: id,
          topic: id,
          power: z.number().nonnegative(),
          conditions: z.array(conditionSchema).optional(),
          rebutted: z.boolean().optional(),
          reply: id.optional(),
        })
        .strict()
    ),
    tells: z.array(z.object({ id, text: id }).strict()),
    weakness: z
      .object({
        affinity: z.enum(['gab', 'instinct', 'grit']),
        multiplier: z.number().positive(),
        revealText: id,
      })
      .strict(),
    moves: z.array(
      z
        .object({
          id,
          text: id,
          damage: z.number().nonnegative(),
          weight: z.number().positive().optional(),
          notBeforeTurn: z.number().int().positive().optional(),
        })
        .strict()
    ),
    turnLimit: z.number().int().positive().optional(),
    winText: z.array(z.string()),
    loseText: z.array(z.string()),
    onWin: z.array(effectSchema).optional(),
    onLose: z.array(effectSchema).optional(),
  })
  .strict()

const exitSchema = z
  .object({
    to: id,
    label: id,
    conditions: z.array(conditionSchema).optional(),
    energyCost: z.number().nonnegative().optional(),
    advancesPeriod: z.boolean().optional(),
  })
  .strict()
export const placeSchema = z
  .object({
    id,
    district: id,
    name: id,
    blurb: z.string().optional(),
    onEnter: z
      .array(
        z
          .object({
            dialogueId: id,
            conditions: z.array(conditionSchema).optional(),
            once: z.boolean().optional(),
          })
          .strict()
      )
      .optional(),
    exits: z.array(exitSchema),
    npcs: z
      .array(
        z
          .object({
            npcId: id,
            dialogueId: id,
            conditions: z.array(conditionSchema).optional(),
            label: id.optional(),
          })
          .strict()
      )
      .optional(),
    actions: z
      .array(
        z
          .object({
            id,
            label: id,
            conditions: z.array(conditionSchema).optional(),
            effects: z.array(effectSchema).optional(),
            energyCost: z.number().nonnegative().optional(),
            once: z.boolean().optional(),
            advancesPeriod: z.boolean().optional(),
          })
          .strict()
      )
      .optional(),
    station: z.boolean().optional(),
    map: id.optional(),
    spawn: z.object({ x: z.number(), y: z.number() }).strict().optional(),
  })
  .strict()

export const districtSchema = z
  .object({
    id,
    name: id,
    places: z.array(id),
    connections: z.array(id),
    unlockedBy: z.array(conditionSchema).optional(),
  })
  .strict()
