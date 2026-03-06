/**
 * Day/night cycle overlay synced to local system clock.
 */
export class DayNight {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly fireflies: Phaser.GameObjects.Graphics;

  /**
   * Creates day/night visual overlays.
   *
   * @param scene Scene hosting this system.
   */
  constructor(private readonly scene: Phaser.Scene) {
    this.overlay = scene.add.rectangle(480, 270, 960, 540, 0x0f1c2e, 0.0);
    this.overlay.setDepth(20);

    this.fireflies = scene.add.graphics();
    this.fireflies.setDepth(21);
  }

  /**
   * Updates tint and fireflies according to local hour.
   *
   * @param now Current timestamp.
   */
  update(now: number): void {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 17) {
      this.overlay.setFillStyle(0xf0dfbf, 0.03);
      this.renderFireflies(0, now);
      return;
    }

    if (hour >= 17 && hour < 20) {
      this.overlay.setFillStyle(0xe79d5a, 0.18);
      this.renderFireflies(0.15, now);
      return;
    }

    this.overlay.setFillStyle(0x0f1c2e, 0.42);
    this.renderFireflies(0.8, now);
  }

  private renderFireflies(intensity: number, now: number): void {
    this.fireflies.clear();
    if (intensity <= 0) {
      return;
    }

    this.fireflies.fillStyle(0xfff5c8, 0.65 * intensity);
    for (let i = 0; i < 28; i += 1) {
      const x = (i * 37 + (now / 22) * (1 + (i % 3))) % 960;
      const y = 300 + ((i * 53 + now / 19) % 220);
      this.fireflies.fillCircle(x, y, i % 2 === 0 ? 1 : 2);
    }
  }
}
