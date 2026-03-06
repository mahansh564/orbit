/**
 * Boot scene responsible for generating placeholder textures.
 */
export class BootScene extends Phaser.Scene {
  /**
   * Creates a new boot scene.
   */
  constructor() {
    super('BootScene');
  }

  /**
   * Generates textures and immediately starts the main scene.
   */
  create(): void {
    this.createTileTextures();
    this.createCreatureTextures();
    this.createCreatureAnimations();
    this.scene.start('TerrariumScene');
  }

  private createTileTextures(): void {
    this.drawTileTexture('tile-grass', [0x3b7d4f, 0x4f9b5c, 0x2b6b42]);
    this.drawTileTexture('tile-dirt', [0x6b4a2f, 0x7f5a3b, 0x553624]);
    this.drawTileTexture('tile-water', [0x2b5f88, 0x3676a9, 0x1f4868]);
    this.drawTileTexture('tile-rock', [0x6f7479, 0x888f95, 0x535a60]);
  }

  private createCreatureTextures(): void {
    this.createCreatureSheet('creature-fox', '#c97337');
    this.createCreatureSheet('creature-otter', '#7c5b3a');
    this.createCreatureSheet('creature-slime', '#69b768');
    this.createCreatureSheet('creature-bird', '#5e86c7');
  }

  private createCreatureAnimations(): void {
    const creatureTypes = ['fox', 'otter', 'slime', 'bird'] as const;

    for (const type of creatureTypes) {
      if (!this.anims.exists(`${type}-walk`)) {
        this.anims.create({
          key: `${type}-walk`,
          frames: [1, 2, 3, 4].map((index) => ({ key: `creature-${type}-walk-${index}` })),
          frameRate: 8,
          repeat: -1
        });
      }

      for (const state of ['working', 'foraging', 'alert', 'celebrating', 'distressed'] as const) {
        const stateKey = `${type}-${state}`;
        if (this.anims.exists(stateKey)) {
          continue;
        }

        this.anims.create({
          key: stateKey,
          frames: [1, 2, 3, 4].map((index) => ({ key: `creature-${type}-walk-${index}` })),
          frameRate: state === 'alert' ? 11 : 8,
          repeat: -1
        });
      }
    }
  }

  private drawTileTexture(textureKey: string, palette: [number, number, number]): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(palette[0], 1);
    gfx.fillRect(0, 0, 16, 16);
    gfx.fillStyle(palette[1], 1);

    for (let i = 0; i < 7; i += 1) {
      gfx.fillRect(Phaser.Math.Between(0, 15), Phaser.Math.Between(0, 15), 2, 2);
    }

    gfx.fillStyle(palette[2], 1);
    for (let i = 0; i < 5; i += 1) {
      gfx.fillRect(Phaser.Math.Between(0, 15), Phaser.Math.Between(0, 15), 1, 1);
    }

    gfx.generateTexture(textureKey, 16, 16);
    gfx.destroy();
  }

  private createCreatureSheet(textureKey: string, bodyColor: string): void {
    this.drawCreatureFrame(`${textureKey}-idle`, bodyColor, 0);
    this.drawCreatureFrame(`${textureKey}-walk-1`, bodyColor, 1);
    this.drawCreatureFrame(`${textureKey}-walk-2`, bodyColor, 2);
    this.drawCreatureFrame(`${textureKey}-walk-3`, bodyColor, 3);
    this.drawCreatureFrame(`${textureKey}-walk-4`, bodyColor, 4);
  }

  private drawCreatureFrame(textureKey: string, bodyColor: string, frame: number): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x000000, 0);
    gfx.fillRect(0, 0, 32, 32);

    gfx.fillStyle(Number.parseInt(bodyColor.replace('#', ''), 16), 1);
    gfx.fillRect(6, 8, 20, 16);
    gfx.fillRect(10, 4, 12, 8);

    const legOffset = frame === 0 ? 0 : frame % 2 === 0 ? -1 : 1;
    gfx.fillRect(9 + legOffset, 24, 4, 6);
    gfx.fillRect(19 - legOffset, 24, 4, 6);

    gfx.fillStyle(0x111111, 1);
    gfx.fillRect(12, 10, 2, 2);
    gfx.fillRect(18, 10, 2, 2);

    gfx.fillStyle(0xf9f9f9, 1);
    gfx.fillRect(13, 11, 1, 1);
    gfx.fillRect(19, 11, 1, 1);

    gfx.generateTexture(textureKey, 32, 32);
    gfx.destroy();
  }
}
