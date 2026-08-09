import Phaser from 'phaser'

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene')
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#101923')
    const graphics = this.add.graphics()
    graphics.fillStyle(0x1e2a36).fillRect(0, 250, 1280, 470)
    graphics.fillStyle(0x304252).fillRect(0, 390, 1280, 330)
    graphics.fillStyle(0xf3c969, 0.65)
    for (let x = 70; x < 1280; x += 190) graphics.fillRect(x, 225, 5, 170)
    graphics.lineStyle(2, 0xa7b2b5, 0.22)
    for (let x = -300; x < 1500; x += 38) graphics.lineBetween(x, 0, x + 220, 720)
    this.add
      .text(48, 44, 'GAROA', {
        fontFamily: 'monospace',
        fontSize: '52px',
        color: '#f3c969',
        fontStyle: 'bold',
      })
      .setAlpha(0.12)
  }
}

export function mountBackdrop(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    transparent: true,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [WorldScene],
    input: { gamepad: true },
  })
}
