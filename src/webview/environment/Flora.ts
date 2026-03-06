import type { HealthSignal } from '@shared/types';

interface Sprout {
  sprite: Phaser.GameObjects.Rectangle;
  life: number;
}

/**
 * Flora system that grows or withers with cumulative health outcomes.
 */
export class Flora {
  private readonly sprouts: Sprout[] = [];
  private fertility = 0;

  /**
   * Creates flora system.
   *
   * @param scene Scene where flora should render.
   */
  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * Applies health signal to growth model.
   *
   * @param signal Incoming health signal.
   */
  applySignal(signal: HealthSignal): void {
    if (signal.type === 'positive' || signal.type === 'milestone') {
      this.fertility = Math.min(100, this.fertility + 10);
      this.growSprout();
      return;
    }

    if (signal.type === 'negative' || signal.type === 'critical') {
      this.fertility = Math.max(0, this.fertility - 14);
      this.witherSprout();
    }
  }

  /**
   * Advances flora animations and cleanup.
   *
   * @param delta Delta frame time.
   */
  update(delta: number): void {
    for (let i = this.sprouts.length - 1; i >= 0; i -= 1) {
      const sprout = this.sprouts[i];
      if (sprout === undefined) {
        continue;
      }

      sprout.life -= delta;
      const alpha = Math.max(0.2, Math.min(1, sprout.life / 22000));
      sprout.sprite.setAlpha(alpha);

      if (sprout.life <= 0) {
        sprout.sprite.destroy();
        this.sprouts.splice(i, 1);
      }
    }
  }

  private growSprout(): void {
    if (this.sprouts.length >= 64) {
      return;
    }

    const x = Phaser.Math.Between(18, 942);
    const y = Phaser.Math.Between(350, 518);
    const height = Phaser.Math.Between(8, 16);

    const sprout = this.scene.add.rectangle(x, y, 4, height, 0x56c05f, 0.95);
    sprout.setOrigin(0.5, 1);
    sprout.setDepth(6);

    this.sprouts.push({
      sprite: sprout,
      life: 20000 + this.fertility * 180
    });
  }

  private witherSprout(): void {
    const sprout = this.sprouts.pop();
    if (sprout === undefined) {
      return;
    }

    sprout.sprite.setFillStyle(0x6f5f4b, 0.85);
    sprout.life = Math.min(sprout.life, 2500);
    this.sprouts.unshift(sprout);
  }
}
