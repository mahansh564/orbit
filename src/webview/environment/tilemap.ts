/**
 * JSON tilemap data used by terrarium background rendering.
 */
export interface TerrariumTilemapAsset {
  /** Tile size used for map coordinates. */
  tileSize: number;
  /** Number of tile columns. */
  width: number;
  /** Number of tile rows. */
  height: number;
  /** Mapping from row symbol to texture key. */
  legend: Record<string, string>;
  /** Tile rows encoded as compact symbol strings. */
  rows: string[];
}

/**
 * Fallback tile texture selector when tilemap data is unavailable.
 *
 * @param row Tile row index.
 * @param col Tile column index.
 * @returns Texture key.
 */
export function pickTileTextureFallback(row: number, col: number): string {
  const noise = (row * 17 + col * 29) % 100;

  if (row < 8) {
    return noise > 72 ? 'tile-water' : 'tile-grass';
  }

  if (row > 24) {
    return noise > 45 ? 'tile-dirt' : 'tile-rock';
  }

  if (noise > 86) {
    return 'tile-rock';
  }

  return 'tile-grass';
}

/**
 * Resolves the tile texture key for a map coordinate.
 *
 * @param map Parsed tilemap asset.
 * @param row Tile row index.
 * @param col Tile column index.
 * @returns Texture key resolved from legend or fallback pattern.
 */
export function resolveTileFromMap(map: TerrariumTilemapAsset, row: number, col: number): string {
  const line = map.rows[row];
  if (line === undefined) {
    return pickTileTextureFallback(row, col);
  }

  const symbol = line[col];
  if (symbol === undefined) {
    return pickTileTextureFallback(row, col);
  }

  return map.legend[symbol] ?? pickTileTextureFallback(row, col);
}

/**
 * Parses and sanitizes JSON tilemap payload loaded from cache.
 *
 * @param value Unknown JSON payload.
 * @returns Parsed tilemap asset or null when invalid.
 */
export function readTilemapAsset(value: unknown): TerrariumTilemapAsset | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.tileSize !== 'number' ||
    typeof record.width !== 'number' ||
    typeof record.height !== 'number' ||
    !Array.isArray(record.rows) ||
    typeof record.legend !== 'object' ||
    record.legend === null
  ) {
    return null;
  }

  const rows = record.rows.filter((entry): entry is string => typeof entry === 'string');
  if (rows.length === 0) {
    return null;
  }

  const legendInput = record.legend as Record<string, unknown>;
  const legend: Record<string, string> = {};
  for (const [symbol, key] of Object.entries(legendInput)) {
    if (typeof key === 'string' && symbol.length > 0) {
      legend[symbol] = key;
    }
  }

  if (Object.keys(legend).length === 0) {
    return null;
  }

  return {
    tileSize: Math.max(1, Math.trunc(record.tileSize)),
    width: Math.max(1, Math.trunc(record.width)),
    height: Math.max(1, Math.trunc(record.height)),
    legend,
    rows
  };
}
