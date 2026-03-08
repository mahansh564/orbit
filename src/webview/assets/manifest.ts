import ambientStationAudioUrl from '../../assets/audio/ambient-station.wav?url';
import analystIdleUrl from '../../../inspo/Spaceship Pack/ship_5.png?url';
import analystWalkAUrl from '../../../inspo/Spaceship Pack/ship_5.png?url';
import analystWalkBUrl from '../../../inspo/Spaceship Pack/ship_6.png?url';
import engineerIdleUrl from '../../../inspo/Spaceship Pack/ship_1.png?url';
import engineerWalkAUrl from '../../../inspo/Spaceship Pack/ship_1.png?url';
import engineerWalkBUrl from '../../../inspo/Spaceship Pack/ship_2.png?url';
import pilotIdleUrl from '../../../inspo/Spaceship Pack/ship_3.png?url';
import pilotWalkAUrl from '../../../inspo/Spaceship Pack/ship_3.png?url';
import pilotWalkBUrl from '../../../inspo/Spaceship Pack/ship_4.png?url';
import securityIdleUrl from '../../../inspo/Spaceship Pack/ship_2.png?url';
import securityWalkAUrl from '../../../inspo/Spaceship Pack/ship_2.png?url';
import securityWalkBUrl from '../../../inspo/Spaceship Pack/ship_1.png?url';
import stationBackgroundUrl from '../../../inspo/CelestialObjects/CelestialObjects.png?url';
import tileConduitUrl from '../../assets/sprites/tiles/tile-conduit.svg?url';
import tileDeckUrl from '../../assets/sprites/tiles/tile-deck.svg?url';
import tileGrateUrl from '../../assets/sprites/tiles/tile-grate.svg?url';
import tileViewportUrl from '../../assets/sprites/tiles/tile-viewport.svg?url';
import stationTilemapUrl from '../../assets/tilemaps/station.json?url';

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
 * Tile textures used by station background rendering.
 */
export const TILE_TEXTURE_ASSETS: readonly SvgAsset[] = [
  { key: 'tile-deck', url: tileDeckUrl, width: 16, height: 16 },
  { key: 'tile-grate', url: tileGrateUrl, width: 16, height: 16 },
  { key: 'tile-conduit', url: tileConduitUrl, width: 16, height: 16 },
  { key: 'tile-viewport', url: tileViewportUrl, width: 16, height: 16 }
];

/**
 * Crew frame textures used for idle and walk animations.
 */
export const CREW_TEXTURE_ASSETS: readonly SvgAsset[] = [
  { key: 'crew-engineer-idle', url: engineerIdleUrl, width: 32, height: 32 },
  { key: 'crew-engineer-walk-a', url: engineerWalkAUrl, width: 32, height: 32 },
  { key: 'crew-engineer-walk-b', url: engineerWalkBUrl, width: 32, height: 32 },
  { key: 'crew-pilot-idle', url: pilotIdleUrl, width: 32, height: 32 },
  { key: 'crew-pilot-walk-a', url: pilotWalkAUrl, width: 32, height: 32 },
  { key: 'crew-pilot-walk-b', url: pilotWalkBUrl, width: 32, height: 32 },
  { key: 'crew-analyst-idle', url: analystIdleUrl, width: 32, height: 32 },
  { key: 'crew-analyst-walk-a', url: analystWalkAUrl, width: 32, height: 32 },
  { key: 'crew-analyst-walk-b', url: analystWalkBUrl, width: 32, height: 32 },
  { key: 'crew-security-idle', url: securityIdleUrl, width: 32, height: 32 },
  { key: 'crew-security-walk-a', url: securityWalkAUrl, width: 32, height: 32 },
  { key: 'crew-security-walk-b', url: securityWalkBUrl, width: 32, height: 32 }
];

/**
 * Tilemap JSON asset key used by background renderer.
 */
export const STATION_TILEMAP_KEY = 'tilemap-station';

/**
 * Tilemap JSON URL emitted by Vite.
 */
export const STATION_TILEMAP_URL = stationTilemapUrl;

/**
 * Background texture key used by station scene.
 */
export const STATION_BACKGROUND_TEXTURE_KEY = 'station-background';

/**
 * Background texture URL emitted by Vite.
 */
export const STATION_BACKGROUND_TEXTURE_URL = stationBackgroundUrl;

/**
 * Ambient audio tracks available to the station scene.
 */
export const STATION_AUDIO_ASSETS: readonly AudioAsset[] = [
  { key: 'ambient-station', url: ambientStationAudioUrl }
];
