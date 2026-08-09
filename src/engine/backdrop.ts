import Phaser from 'phaser'

export interface WorldActor {
  readonly id: string
  readonly label: string
  readonly kind: 'npc' | 'action'
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
const MAP_WIDTH = 24
const MAP_HEIGHT = 15

export class WorldScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd?: Record<'up' | 'down' | 'left' | 'right' | 'interact', Phaser.Input.Keyboard.Key>
  private obstacles?: Phaser.Physics.Arcade.StaticGroup
  private actors?: Phaser.Physics.Arcade.StaticGroup
  private exits?: Phaser.Physics.Arcade.StaticGroup
  private labels: Phaser.GameObjects.GameObject[] = []
  private nearby?: { id: string; label: string }
  private exitCooldown = 0
  private enabled = false

  constructor() {
    super('WorldScene')
  }
  preload(): void {
    this.load.atlas('garoa', 'atlas.png', 'atlas.json')
    this.load.image('fisherg-city', 'assets/fisherg-city/sMockup.png')
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
    drawMap(this, palette, bridge.presentation.placeId)
    this.createBorders(palette)
    this.createProps(palette, bridge.presentation.placeId)
    this.createExits(bridge.presentation.exits)
    this.createActors(bridge.presentation.actors)
    this.player = this.physics.add
      .sprite(MAP_WIDTH * TILE * 0.5, MAP_HEIGHT * TILE * 0.8, 'garoa', 'protagonista_down_0')
      .setScale(1.6)
    this.player.setSize(12, 10).setOffset(10, 20).setCollideWorldBounds(true).setDepth(10)
    this.physics.add.collider(this.player, this.obstacles)
    this.physics.add.collider(this.player, this.actors)
    this.physics.add.overlap(this.player, this.exits, (_player, zone) => this.enterExit(zone))
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(this.scale.width >= 900 ? 2 : 1)
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE, MAP_HEIGHT * TILE)
  }

  private createBorders(palette: Palette): void {
    const exits = bridge.presentation?.exits.length ?? 0
    const gapCenters = Array.from({ length: exits }, (_, index) =>
      Math.round(((index + 1) * MAP_WIDTH) / (exits + 1))
    )
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (!gapCenters.some((center) => Math.abs(center - x) <= 1)) this.block(x, 0, palette.wall)
      this.block(x, MAP_HEIGHT - 1, palette.wall)
    }
    for (let y = 1; y < MAP_HEIGHT - 1; y += 1) {
      this.block(0, y, palette.wall)
      this.block(MAP_WIDTH - 1, y, palette.wall)
    }
  }
  private createProps(palette: Palette, seedText: string): void {
    let seed = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const buildings = [
      { x: 2, y: 2, width: 6, height: 3 },
      { x: 17, y: 2, width: 5, height: 3 },
      { x: 2, y: 10, width: 5, height: 3 },
      { x: 18, y: 10, width: 4, height: 3 },
    ]
    for (const building of buildings)
      for (let y = 0; y < building.height; y += 1)
        for (let x = 0; x < building.width; x += 1) {
          const edge = y === 0 || x === 0 || x === building.width - 1
          this.block(building.x + x, building.y + y, edge ? palette.wall : palette.prop)
        }
    for (let index = 0; index < 8; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      const x = 2 + (seed % (MAP_WIDTH - 4))
      const y = 6 + ((seed >>> 8) % 4)
      if (x > 9 && x < 15) continue
      this.block(x, y, index % 3 === 0 ? palette.accent : palette.prop)
    }
  }
  private createExits(exits: readonly WorldExit[]): void {
    exits.forEach((exit, index) => {
      const x = Math.round(((index + 1) * MAP_WIDTH * TILE) / (exits.length + 1))
      const zone = this.add.zone(x, TILE * 0.55, TILE * 2.4, TILE * 1.2)
      this.physics.add.existing(zone, true)
      zone.setData('actionId', exit.actionId)
      zone.setData('label', exit.label)
      this.exits?.add(zone)
      const sign = this.add
        .text(x, TILE * 1.25, `▲ ${exit.label}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#f3c969',
          backgroundColor: '#101923dd',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(20)
      this.labels.push(sign)
    })
  }
  private createActors(actors: readonly WorldActor[]): void {
    actors.forEach((actor, index) => {
      const x = (index % 2 === 0 ? 18 : 6) * TILE
      const y = 10.5 * TILE
      const frame = actor.kind === 'npc' ? npcFrame(actor.id) : 'banca_jornal'
      const sprite = this.physics.add.staticSprite(x, y, 'garoa', frame).setScale(1.5).setDepth(8)
      sprite.setData('actionId', actor.id)
      sprite.setData('label', actor.label)
      sprite.refreshBody()
      this.actors?.add(sprite)
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
    const direction =
      Math.abs(velocity.x) > Math.abs(velocity.y)
        ? velocity.x < 0
          ? 'left'
          : 'right'
        : velocity.y < 0
          ? 'up'
          : 'down'
    if (velocity.lengthSq() > 0)
      this.player.setFrame(`protagonista_${direction}_${Math.floor(time / 180) % 2}`)
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
  }
  return options[district] ?? options.tiete!
}
function drawMap(scene: Phaser.Scene, palette: Palette, placeId: string): void {
  scene.add
    .image(MAP_WIDTH * TILE * 0.5, MAP_HEIGHT * TILE * 0.5, 'fisherg-city')
    .setDisplaySize(MAP_WIDTH * TILE, MAP_HEIGHT * TILE)
    .setDepth(0)
  scene.add
    .rectangle(
      MAP_WIDTH * TILE * 0.5,
      MAP_HEIGHT * TILE * 0.5,
      MAP_WIDTH * TILE,
      MAP_HEIGHT * TILE,
      palette.void,
      0.3
    )
    .setDepth(1)
  const rain = scene.add.graphics().setDepth(2)
  rain.lineStyle(1, 0xa7b2b5, 0.28)
  for (let x = -MAP_HEIGHT * TILE; x < MAP_WIDTH * TILE; x += 38)
    rain.lineBetween(x, 0, x + MAP_HEIGHT * TILE * 0.35, MAP_HEIGHT * TILE)
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
function npcFrame(actionId: string): string {
  const id = actionId.replace('talk:', '')
  const known: Record<string, string> = {
    ajudante: 'ajudante_down_0',
    seu_jorge: 'seu_jorge_down_0',
    dona_cida: 'dona_cida_down_0',
    yumi: 'yumi_down_0',
    tico: 'tico_down_0',
    renan: 'ajudante_down_0',
    val: 'protagonista_down_0',
  }
  return known[id] ?? 'tico_down_0'
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
