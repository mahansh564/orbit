import ambientTerrariumAudioUrl from '../../assets/audio/ambient-terrarium.wav?url';
import birdIdleUrl from '../../assets/sprites/creatures/bird/idle.svg?url';
import birdWalkAUrl from '../../assets/sprites/creatures/bird/walk-a.svg?url';
import birdWalkBUrl from '../../assets/sprites/creatures/bird/walk-b.svg?url';
import foxIdleUrl from '../../assets/sprites/creatures/fox/idle.svg?url';
import foxWalkAUrl from '../../assets/sprites/creatures/fox/walk-a.svg?url';
import foxWalkBUrl from '../../assets/sprites/creatures/fox/walk-b.svg?url';
import otterIdleUrl from '../../assets/sprites/creatures/otter/idle.svg?url';
import otterWalkAUrl from '../../assets/sprites/creatures/otter/walk-a.svg?url';
import otterWalkBUrl from '../../assets/sprites/creatures/otter/walk-b.svg?url';
import slimeIdleUrl from '../../assets/sprites/creatures/slime/idle.svg?url';
import slimeWalkAUrl from '../../assets/sprites/creatures/slime/walk-a.svg?url';
import slimeWalkBUrl from '../../assets/sprites/creatures/slime/walk-b.svg?url';
import tileDirtUrl from '../../assets/sprites/tiles/tile-dirt.svg?url';
import tileGrassUrl from '../../assets/sprites/tiles/tile-grass.svg?url';
import tileRockUrl from '../../assets/sprites/tiles/tile-rock.svg?url';
import tileWaterUrl from '../../assets/sprites/tiles/tile-water.svg?url';
import terrariumTilemapUrl from '../../assets/tilemaps/terrarium.json?url';

/**
 * Static image asset descriptor for Phaser loaders.
 */
export interface SvgAsset {
  /** Texture key registered in Phaser cache. */
  key: string;
  /** Resolved asset URL emitted by Vite. */
  url: string;
  /** Desired rasterized width in pixels. */
  width: number;
  /** Desired rasterized height in pixels. */
  height: number;
}

/**
 * Static audio asset descriptor for Phaser loaders.
 */
export interface AudioAsset {
  /** Audio key registered in Phaser cache. */
  key: string;
  /** Resolved asset URL emitted by Vite. */
  url: string;
}

/**
 * Tile textures used by terrarium background rendering.
 */
export const TILE_TEXTURE_ASSETS: readonly SvgAsset[] = [
  { key: 'tile-grass', url: tileGrassUrl, width: 16, height: 16 },
  { key: 'tile-dirt', url: tileDirtUrl, width: 16, height: 16 },
  { key: 'tile-water', url: tileWaterUrl, width: 16, height: 16 },
  { key: 'tile-rock', url: tileRockUrl, width: 16, height: 16 }
];

/**
 * Creature frame textures used for idle and walk animations.
 */
export const CREATURE_TEXTURE_ASSETS: readonly SvgAsset[] = [
  { key: 'creature-fox-idle', url: foxIdleUrl, width: 32, height: 32 },
  { key: 'creature-fox-walk-a', url: foxWalkAUrl, width: 32, height: 32 },
  { key: 'creature-fox-walk-b', url: foxWalkBUrl, width: 32, height: 32 },
  { key: 'creature-otter-idle', url: otterIdleUrl, width: 32, height: 32 },
  { key: 'creature-otter-walk-a', url: otterWalkAUrl, width: 32, height: 32 },
  { key: 'creature-otter-walk-b', url: otterWalkBUrl, width: 32, height: 32 },
  { key: 'creature-slime-idle', url: slimeIdleUrl, width: 32, height: 32 },
  { key: 'creature-slime-walk-a', url: slimeWalkAUrl, width: 32, height: 32 },
  { key: 'creature-slime-walk-b', url: slimeWalkBUrl, width: 32, height: 32 },
  { key: 'creature-bird-idle', url: birdIdleUrl, width: 32, height: 32 },
  { key: 'creature-bird-walk-a', url: birdWalkAUrl, width: 32, height: 32 },
  { key: 'creature-bird-walk-b', url: birdWalkBUrl, width: 32, height: 32 }
];

/**
 * Tilemap JSON asset key used by background terrain renderer.
 */
export const TERRARIUM_TILEMAP_KEY = 'tilemap-terrarium';

/**
 * Tilemap JSON URL emitted by Vite.
 */
export const TERRARIUM_TILEMAP_URL = terrariumTilemapUrl;

/**
 * Ambient audio tracks available to the terrarium scene.
 */
export const TERRARIUM_AUDIO_ASSETS: readonly AudioAsset[] = [
  { key: 'ambient-terrarium', url: ambientTerrariumAudioUrl }
];
