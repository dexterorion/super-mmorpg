import Phaser from 'phaser'
import { CITY_MAP_HEIGHT, CITY_MAP_WIDTH, cityMapFor } from './cityMaps.js'

export interface WorldActor {
  readonly id: string
  readonly label: string
  readonly kind: 'npc'
}
export interface WorldExit {
  readonly actionId: string
  readonly label: string
}
export interface WorldPresentation {
  readonly placeId: string
  readonly placeName: string
  readonly district: string
  readonly actors: readonly WorldActor[]
  readonly exits: readonly WorldExit[]
  readonly enabled: boolean
}
export interface WorldController {
  sync(presentation: WorldPresentation): void
  onAction(callback: (actionId: string) => void): void
  onPrompt(callback: (label: string | undefined) => void): void
}

type ActionCallback = (actionId: string) => void
type PromptCallback = (label: string | undefined) => void

class Bridge {
  presentation?: WorldPresentation
  actionCallback: ActionCallback = () => undefined
  promptCallback: PromptCallback = () => undefined
  scene?: WorldScene
  sync(presentation: WorldPresentation): void {
    const changed = presentation.placeId !== this.presentation?.placeId
    this.presentation = presentation
    if (changed) this.scene?.buildMap()
    this.scene?.setEnabled(presentation.enabled)
  }
}

const bridge = new Bridge()
const TILE = 32
const MAP_WIDTH = CITY_MAP_WIDTH
const MAP_HEIGHT = CITY_MAP_HEIGHT

export class WorldScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd?: Record<'up' | 'down' | 'left' | 'right' | 'interact', Phaser.Input.Keyboard.Key>
  private obstacles?: Phaser.Physics.Arcade.StaticGroup
  private actors?: Phaser.Physics.Arcade.StaticGroup
  private exits?: Phaser.Physics.Arcade.StaticGroup
  private labels: Phaser.GameObjects.GameObject[] = []
  private playerShadow?: Phaser.GameObjects.Ellipse
  private nearby?: { id: string; label: string }
  private exitCooldown = 0
  private enabled = false

  constructor() {
    super('WorldScene')
  }
  preload(): void {
    this.load.atlas('garoa', 'atlas.png', 'atlas.json')
    this.load.image('centro-anhangabau', 'assets/garoa-city/centro-anhangabau.png')
    this.load.image('tiete-slice', 'assets/garoa-city/tiete.png')
    this.load.image('minhocao-slice', 'assets/garoa-city/minhocao.png')
    this.load.image('paulista-slice', 'assets/garoa-city/paulista.png')
    this.load.spritesheet('garoa-player', 'assets/garoa-characters-v2/characters-sheet.png', {
      frameWidth: 128,
      frameHeight: 170,
      endFrame: 71,
    })
    this.load.spritesheet('garoa-npcs', 'assets/garoa-characters-v3/characters-sheet.png', {
      frameWidth: 128,
      frameHeight: 170,
      endFrame: 71,
    })
    this.load.spritesheet('kenney-people', 'assets/kenney-rpg-urban/Tilemap/tilemap.png', {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 1,
      endFrame: 485,
    })
  }
  create(): void {
    bridge.scene = this
    this.cameras.main.setBackgroundColor('#101923')
    this.cursors = this.input.keyboard?.createCursorKeys()
    this.wasd = this.input.keyboard?.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      interact: 'SPACE',
    }) as typeof this.wasd
    this.buildMap()
  }

  buildMap(): void {
    if (!this.physics?.world || !bridge.presentation) return
    this.children.removeAll(true)
    this.physics.world.colliders.destroy()
    this.labels = []
    this.obstacles = this.physics.add.staticGroup()
    this.actors = this.physics.add.staticGroup()
    this.exits = this.physics.add.staticGroup()
    const palette = districtPalette(bridge.presentation.district)
    this.cameras.main.setBackgroundColor(palette.void)
    const map = cityMapFor(bridge.presentation.district)
    drawMap(this, palette, bridge.presentation.placeId, map)
    this.createBorders(palette)
    this.createCollisionMap(map.collisions)
    this.createExits(bridge.presentation.exits)
    this.createActors(bridge.presentation.actors)
    this.playerShadow = this.add
      .ellipse(MAP_WIDTH * TILE * 0.5 + 3, MAP_HEIGHT * TILE * 0.8 + 14, 28, 12, 0x071018, 0.55)
      .setDepth(9)
    this.player = this.physics.add
      .sprite(MAP_WIDTH * TILE * 0.5, MAP_HEIGHT * TILE * 0.8, 'garoa-player', 1)
      .setScale(0.4)
    this.player.setSize(48, 24).setOffset(40, 136).setCollideWorldBounds(true).setDepth(10)
    this.physics.add.collider(this.player, this.obstacles)
    this.physics.add.collider(this.player, this.actors)
    this.physics.add.overlap(this.player, this.exits, (_player, zone) => this.enterExit(zone))
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(this.scale.width >= 900 ? 2 : 1)
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE, MAP_HEIGHT * TILE)
  }

  private createBorders(palette: Palette): void {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      this.block(x, 0, palette.wall)
      this.block(x, MAP_HEIGHT - 1, palette.wall)
    }
    for (let y = 1; y < MAP_HEIGHT - 1; y += 1) {
      if (y < 11 || y > 13) {
        this.block(0, y, palette.wall)
        this.block(MAP_WIDTH - 1, y, palette.wall)
      }
    }
  }
  private createCollisionMap(collisions: ReturnType<typeof cityMapFor>['collisions']): void {
    for (const collision of collisions)
      this.obstacleRect(
        collision.x * TILE,
        collision.y * TILE,
        collision.width * TILE,
        collision.height * TILE
      )
  }
  private createExits(exits: readonly WorldExit[]): void {
    exits.forEach((exit, index) => {
      const onLeft = index % 2 === 0
      const x = onLeft ? TILE * 0.45 : MAP_WIDTH * TILE - TILE * 0.45
      const y = (11.5 + Math.floor(index / 2)) * TILE
      const zone = this.add.zone(x, y, TILE * 0.9, TILE * 1.4)
      this.physics.add.existing(zone, true)
      zone.setData('actionId', exit.actionId)
      zone.setData('label', exit.label)
      this.exits?.add(zone)
      const sign = this.add
        .text(x + (onLeft ? 12 : -12), y - 24, `${onLeft ? '◀' : '▶'} ${exit.label}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#f3c969',
          backgroundColor: '#101923dd',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(onLeft ? 0 : 1, 0.5)
        .setDepth(20)
      this.labels.push(sign)
    })
  }
  private createActors(actors: readonly WorldActor[]): void {
    actors.forEach((actor, index) => {
      const x = (index % 2 === 0 ? 18 : 6) * TILE
      const y = 12.1 * TILE
      const sprite = this.physics.add
        .staticSprite(x, y, 'garoa-npcs', npcFrame(actor.id))
        .setScale(0.4)
        .setDepth(8)
      sprite.setData('actionId', actor.id)
      sprite.setData('label', actor.label)
      sprite.refreshBody()
      this.actors?.add(sprite)
      this.add.ellipse(x + 3, y + 15, 28, 12, 0x071018, 0.55).setDepth(7)
      const label = this.add
        .text(x, y - 30, actor.label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#f0eadb',
          backgroundColor: '#101923cc',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(20)
      this.labels.push(label)
    })
  }
  private block(tileX: number, tileY: number, color: number, width = 1): void {
    const rectangle = this.add
      .rectangle((tileX + width / 2) * TILE, (tileY + 0.5) * TILE, width * TILE, TILE, color)
      .setStrokeStyle(2, 0x101923)
      .setVisible(false)
      .setDepth(4)
    this.physics.add.existing(rectangle, true)
    this.obstacles?.add(rectangle)
  }
  private obstacleRect(x: number, y: number, width: number, height: number): void {
    const rectangle = this.add
      .rectangle(x + width / 2, y + height / 2, width, height)
      .setVisible(false)
    this.physics.add.existing(rectangle, true)
    this.obstacles?.add(rectangle)
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.player?.setVelocity(0)
  }
  override update(time: number): void {
    if (!this.player || !this.enabled || !this.cursors || !this.wasd) return
    const left = this.cursors.left.isDown || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up = this.cursors.up.isDown || this.wasd.up.isDown
    const down = this.cursors.down.isDown || this.wasd.down.isDown
    const velocity = new Phaser.Math.Vector2(
      Number(right) - Number(left),
      Number(down) - Number(up)
    )
      .normalize()
      .scale(125)
    this.player.setVelocity(velocity.x, velocity.y)
    this.playerShadow?.setPosition(this.player.x + 3, this.player.y + 15)
    const direction =
      Math.abs(velocity.x) > Math.abs(velocity.y)
        ? velocity.x < 0
          ? 'left'
          : 'right'
        : velocity.y < 0
          ? 'up'
          : 'down'
    if (velocity.lengthSq() > 0)
      this.player.setFrame(directionFrame(direction, Math.floor(time / 160) % 3))
    this.nearby = this.closestActor()
    bridge.promptCallback(this.nearby?.label)
    if (Phaser.Input.Keyboard.JustDown(this.wasd.interact) && this.nearby)
      bridge.actionCallback(this.nearby.id)
    if (this.exitCooldown > 0) this.exitCooldown -= 1
  }
  private closestActor(): { id: string; label: string } | undefined {
    if (!this.player || !this.actors) return undefined
    let closest: { id: string; label: string; distance: number } | undefined
    for (const child of this.actors.getChildren()) {
      const actor = child as Phaser.Physics.Arcade.Sprite
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, actor.x, actor.y)
      if (distance < 58 && (!closest || distance < closest.distance))
        closest = {
          id: String(actor.getData('actionId')),
          label: String(actor.getData('label')),
          distance,
        }
    }
    return closest
  }
  private enterExit(zone: unknown): void {
    if (this.exitCooldown > 0 || !this.enabled) return
    const object = zone as Phaser.GameObjects.Zone
    this.exitCooldown = 45
    bridge.actionCallback(String(object.getData('actionId')))
  }
}

interface Palette {
  readonly void: number
  readonly floor: number
  readonly floorAlt: number
  readonly wall: number
  readonly prop: number
  readonly accent: number
}
function districtPalette(district: string): Palette {
  const options: Record<string, Palette> = {
    tiete: {
      void: 0x101923,
      floor: 0x718493,
      floorAlt: 0x68727e,
      wall: 0x304252,
      prop: 0x1e2a36,
      accent: 0xf3c969,
    },
    centro: {
      void: 0x171629,
      floor: 0x727797,
      floorAlt: 0x485270,
      wall: 0x292f46,
      prop: 0x31504e,
      accent: 0xd97963,
    },
    bixiga: {
      void: 0x18202b,
      floor: 0xb56555,
      floorAlt: 0x794543,
      wall: 0x442d2f,
      prop: 0x347068,
      accent: 0xf3c969,
    },
    liberdade: {
      void: 0x101923,
      floor: 0x536675,
      floorAlt: 0x82929b,
      wall: 0x303c4a,
      prop: 0x794543,
      accent: 0xdb9772,
    },
    paulista: {
      void: 0x0b1020,
      floor: 0x304267,
      floorAlt: 0x466083,
      wall: 0x141b31,
      prop: 0x735671,
      accent: 0xf2e3ad,
    },
    zona_leste: {
      void: 0x101923,
      floor: 0x3e6970,
      floorAlt: 0x638c8d,
      wall: 0x1e2a36,
      prop: 0x264b52,
      accent: 0xe8e0c5,
    },
    minhocao: {
      void: 0x171629,
      floor: 0x4f7867,
      floorAlt: 0x7da37b,
      wall: 0x292f46,
      prop: 0x485270,
      accent: 0xffe3ad,
    },
    ibirapuera: {
      void: 0x101923,
      floor: 0x57a17f,
      floorAlt: 0x347068,
      wall: 0x214a48,
      prop: 0x8fc898,
      accent: 0xf3c969,
    },
  }
  return options[district] ?? options.tiete!
}
function drawMap(
  scene: Phaser.Scene,
  palette: Palette,
  placeId: string,
  map: ReturnType<typeof cityMapFor>
): void {
  const backdrop = cityBackdropKey(map.id)
  if (backdrop) {
    scene.add.image(MAP_WIDTH * TILE * 0.5, MAP_HEIGHT * TILE * 0.5, backdrop).setDepth(0)
  } else {
    for (const entry of map.tiles)
      scene.add
        .sprite((entry.x + 0.5) * TILE, (entry.y + 0.5) * TILE, 'kenney-people', entry.frame)
        .setScale(2)
        .setDepth(entry.depth ?? 0)
  }
  scene.add
    .rectangle(
      MAP_WIDTH * TILE * 0.5,
      MAP_HEIGHT * TILE * 0.5,
      MAP_WIDTH * TILE,
      MAP_HEIGHT * TILE,
      palette.void,
      backdrop ? 0.1 : 0.3
    )
    .setDepth(1)
  if (!backdrop) drawLandmark(scene, map)
  drawUrbanDepth(scene, map)
  const rain = scene.add.graphics().setDepth(12)
  rain.lineStyle(1, 0xcbd7d9, 0.24)
  for (let x = -MAP_HEIGHT * TILE; x < MAP_WIDTH * TILE; x += 32)
    rain.lineBetween(x, -18, x + 13, 28)
  scene.tweens.add({
    targets: rain,
    x: 32,
    y: 46,
    duration: 520,
    repeat: -1,
  })
  scene.add
    .text(14, MAP_HEIGHT * TILE - 25, placeId.replaceAll('_', ' ').toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f0eadb',
      backgroundColor: '#101923cc',
      padding: { x: 5, y: 3 },
    })
    .setDepth(3)
}

function cityBackdropKey(id: ReturnType<typeof cityMapFor>['id']): string | undefined {
  const keys: Partial<Record<ReturnType<typeof cityMapFor>['id'], string>> = {
    tiete: 'tiete-slice',
    centro: 'centro-anhangabau',
    paulista: 'paulista-slice',
    minhocao: 'minhocao-slice',
  }
  return keys[id]
}

function drawUrbanDepth(scene: Phaser.Scene, map: ReturnType<typeof cityMapFor>): void {
  for (const collision of map.collisions)
    scene.add
      .rectangle(
        (collision.x + collision.width / 2) * TILE + 8,
        (collision.y + collision.height / 2) * TILE + 10,
        collision.width * TILE,
        collision.height * TILE,
        0x071018,
        0.28
      )
      .setDepth(1.5)
}

function drawLandmark(scene: Phaser.Scene, map: ReturnType<typeof cityMapFor>): void {
  const color = districtPalette(map.id).accent
  scene.add
    .rectangle(MAP_WIDTH * TILE * 0.5, 54, 250, 28, 0x101923, 0.9)
    .setStrokeStyle(2, color)
    .setDepth(3)
  scene.add
    .text(MAP_WIDTH * TILE * 0.5, 54, map.landmark, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: `#${color.toString(16).padStart(6, '0')}`,
    })
    .setOrigin(0.5)
    .setDepth(4)
  if (map.id === 'liberdade') {
    for (const x of [180, 240, 300, 468, 528, 588])
      scene.add.circle(x, 94, 7, 0xd84b4b).setStrokeStyle(2, 0xf3c969).setDepth(3)
  }
  if (map.id === 'paulista') {
    scene.add.rectangle(384, 190, 160, 8, 0xc94343).setDepth(3)
    scene.add.rectangle(324, 218, 8, 58, 0xc94343).setDepth(3)
    scene.add.rectangle(444, 218, 8, 58, 0xc94343).setDepth(3)
  }
  if (map.id === 'zona_leste') scene.add.rectangle(384, 420, 768, 120, 0x3e6970, 0.42).setDepth(2)
  if (map.id === 'minhocao') scene.add.rectangle(384, 116, 768, 34, 0x485270, 0.88).setDepth(3)
}
function directionFrame(direction: 'down' | 'left' | 'right' | 'up', step: number): number {
  return { down: 0, left: 3, right: 6, up: 9 }[direction] + step
}
function npcFrame(actionId: string): number {
  const id = actionId.replace('talk:', '')
  const rows: Record<string, number> = {
    ajudante: 4,
    seu_jorge: 1,
    dona_cida: 2,
    yumi: 3,
    tico: 4,
    renan: 5,
    val: 2,
  }
  return (rows[id] ?? 5) * 12 + 1
}

export function mountBackdrop(parent: string): WorldController {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: MAP_WIDTH * TILE,
    height: MAP_HEIGHT * TILE,
    backgroundColor: '#101923',
    pixelArt: true,
    roundPixels: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [WorldScene],
    input: { gamepad: true },
  })
  return {
    sync: (presentation) => bridge.sync(presentation),
    onAction: (callback) => {
      bridge.actionCallback = callback
    },
    onPrompt: (callback) => {
      bridge.promptCallback = callback
    },
  }
}
