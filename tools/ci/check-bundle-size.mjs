#!/usr/bin/env node
/**
 * Bundle budget guard.
 *
 * The game must stay quick to load on a phone on mobile data — that is the
 * realistic device for a browser game shared by link. We measure gzipped
 * bytes because that is what actually travels.
 */
import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BUDGETS_KB = {
  'game code (excl. phaser)': 250,
  'phaser runtime': 400,
  total: 700,
}

const DIST = 'dist'

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = walk(DIST).filter((f) => f.endsWith('.js'))
if (files.length === 0) {
  console.error('No JS emitted in dist/ — did the build run?')
  process.exit(1)
}

let phaserKb = 0
let gameKb = 0

for (const file of files) {
  const gz = gzipSync(readFileSync(file)).length / 1024
  if (/phaser/i.test(file)) phaserKb += gz
  else gameKb += gz
}

const totalKb = phaserKb + gameKb
const rows = [
  ['game code (excl. phaser)', gameKb],
  ['phaser runtime', phaserKb],
  ['total', totalKb],
]

let failed = false
console.log('\nBundle budget (gzipped):')
for (const [name, kb] of rows) {
  const budget = BUDGETS_KB[name]
  const ok = kb <= budget
  if (!ok) failed = true
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(26)} ${kb.toFixed(1).padStart(7)} KB / ${budget} KB`
  )
}

if (failed) {
  console.error('\nBundle budget exceeded.')
  process.exit(1)
}
console.log('')
