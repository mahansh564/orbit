/**
 * Orbital cycle overlay synced to local system clock.
 */
export class OrbitalCycle {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly stars: Phaser.GameObjects.Graphics;

  /**
   * Creates orbital visual overlays.
   *
   * @param scene Scene hosting this system.
   */
  constructor(private readonly scene: Phaser.Scene) {
    this.overlay = scene.add.rectangle(480, 270, 960, 540, 0x060a38, 0.0);
    this.overlay.setDepth(20);

    this.stars = scene.add.graphics();
    this.stars.setDepth(21);
  }

  /**
   * Updates tint and stars according to local hour.
   *
   * @param now Current timestamp.
   */
  update(now: number): void {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 17) {
      this.overlay.setFillStyle(0xb8c7ff, 0.07);
      this.renderStars(0.05, now);
      return;
    }

    if (hour >= 17 && hour < 20) {
      this.overlay.setFillStyle(0x8272ff, 0.2);
      this.renderStars(0.24, now);
      return;
    }

    this.overlay.setFillStyle(0x03062b, 0.48);
    this.renderStars(0.9, now);
  }

  private renderStars(intensity: number, now: number): void {
    this.stars.clear();
    if (intensity <= 0) {
      return;
    }

    this.stars.fillStyle(0xf4f7ff, 0.66 * intensity);
    for (let i = 0; i < 32; i += 1) {
      const x = (i * 31 + (now / 24) * (1 + (i % 4))) % 960;
      const y = 18 + ((i * 47 + now / 18) % 170);
      const size = i % 3 === 0 ? 2 : 1;
      this.stars.fillRect(x, y, size, size);
      if (size > 1) {
        this.stars.fillRect(x - 1, y, 1, 1);
        this.stars.fillRect(x + 2, y, 1, 1);
        this.stars.fillRect(x, y - 1, 1, 1);
        this.stars.fillRect(x, y + 2, 1, 1);
      }
    }

    if (intensity >= 0.2) {
      const drift = (now / 35) % 960;
      this.stars.lineStyle(1, 0xcddfff, 0.28 * intensity);
      this.stars.beginPath();
      this.stars.moveTo((120 + drift) % 960, 46);
      this.stars.lineTo((168 + drift) % 960, 72);
      this.stars.lineTo((145 + drift) % 960, 108);
      this.stars.strokePath();

      this.stars.fillStyle(0xe8f2ff, 0.55 * intensity);
      this.stars.fillRect((120 + drift) % 960, 46, 2, 2);
      this.stars.fillRect((168 + drift) % 960, 72, 2, 2);
      this.stars.fillRect((145 + drift) % 960, 108, 2, 2);
    }
  }
}
