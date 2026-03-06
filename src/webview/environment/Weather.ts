import type { HealthSignal } from '@shared/types';

/**
 * Supported weather render modes.
 */
type WeatherMode = 'clear' | 'sun' | 'rain' | 'clouds' | 'rainbow';

/**
 * Weather overlay system reacting to project health signals.
 */
export class Weather {
  private readonly cloudLayer: Phaser.GameObjects.Graphics;
  private readonly rainLayer: Phaser.GameObjects.Graphics;
  private readonly rainbowLayer: Phaser.GameObjects.Graphics;
  private readonly sunDisk: Phaser.GameObjects.Arc;
  private mode: WeatherMode = 'clear';
  private modeUntil = 0;

  /**
   * Creates weather overlay graphics.
   *
   * @param scene Scene where weather should render.
   */
  constructor(private readonly scene: Phaser.Scene) {
    this.cloudLayer = scene.add.graphics();
    this.rainLayer = scene.add.graphics();
    this.rainbowLayer = scene.add.graphics();
    this.sunDisk = scene.add.circle(860, 82, 26, 0xffd65c, 0);

    this.cloudLayer.setDepth(30);
    this.rainLayer.setDepth(31);
    this.rainbowLayer.setDepth(32);
    this.sunDisk.setDepth(29);
  }

  /**
   * Applies an incoming health signal to weather state.
   *
   * @param signal Health signal payload.
   */
  applySignal(signal: HealthSignal): void {
    switch (signal.type) {
      case 'critical':
      case 'negative':
        this.mode = 'rain';
        this.modeUntil = signal.ts + 9000;
        break;
      case 'positive':
        this.mode = 'sun';
        this.modeUntil = signal.ts + 8000;
        break;
      case 'milestone':
        this.mode = 'rainbow';
        this.modeUntil = signal.ts + 10000;
        break;
      case 'neutral':
      default:
        this.mode = 'clouds';
        this.modeUntil = signal.ts + 4500;
        break;
    }
  }

  /**
   * Advances weather rendering.
   *
   * @param now Current timestamp in milliseconds.
   */
  update(now: number): void {
    if (this.modeUntil !== 0 && now > this.modeUntil) {
      this.mode = 'clear';
      this.modeUntil = 0;
    }

    this.cloudLayer.clear();
    this.rainLayer.clear();
    this.rainbowLayer.clear();

    this.sunDisk.setAlpha(this.mode === 'sun' ? 0.95 : 0);

    if (this.mode === 'clouds' || this.mode === 'rain') {
      this.drawClouds(now);
    }

    if (this.mode === 'rain') {
      this.drawRain(now);
    }

    if (this.mode === 'rainbow') {
      this.drawRainbow();
    }
  }

  private drawClouds(now: number): void {
    this.cloudLayer.fillStyle(0xd8e1e8, 0.38);
    const shift = (now / 90) % 96;

    for (let i = 0; i < 5; i += 1) {
      const x = 100 + i * 180 - shift;
      const y = 56 + (i % 2) * 16;
      this.cloudLayer.fillRoundedRect(x, y, 130, 36, 12);
    }
  }

  private drawRain(now: number): void {
    this.rainLayer.lineStyle(2, 0x7eb2ff, 0.65);

    for (let i = 0; i < 150; i += 1) {
      const x = (i * 31 + (now / 12) * 7) % 980;
      const y = (i * 19 + (now / 6) * 5) % 560;
      this.rainLayer.beginPath();
      this.rainLayer.moveTo(x, y);
      this.rainLayer.lineTo(x - 3, y + 9);
      this.rainLayer.strokePath();
    }
  }

  private drawRainbow(): void {
    const centerX = 480;
    const centerY = 520;
    const colors = [0xff6b6b, 0xffb86b, 0xffe96b, 0x7dff6b, 0x6bd0ff, 0x8f6bff];

    for (let i = 0; i < colors.length; i += 1) {
      const color = colors[i] ?? 0xffffff;
      this.rainbowLayer.lineStyle(6, color, 0.85);
      this.rainbowLayer.strokeCircle(centerX, centerY, 260 - i * 10);
    }
  }
}
