import type {
  AgentAction,
  CreatureState,
  PersistedCreatureState,
  TerrariumConfig
} from './types';

/**
 * Default render dimensions of the terrarium webview canvas.
 */
export const TERRARIUM_DIMENSIONS = {
  width: 960,
  height: 540,
  tileSize: 16
} as const;

/**
 * Minimum frame rate that can be configured.
 */
export const MIN_FPS = 1 as const;

/**
 * Maximum frame rate used by webview rendering.
 */
export const MAX_FPS = 30 as const;

/**
 * State duration hints in milliseconds.
 */
export const STATE_DURATIONS: Readonly<Record<CreatureState, number>> = {
  idle: 5000,
  foraging: 3000,
  working: 3500,
  resting: 6000,
  alert: 2500,
  celebrating: 3000,
  distressed: 3500
};

/**
 * XP gains per normalized action type.
 */
export const XP_PER_ACTION: Readonly<Record<AgentAction, number>> = {
  read: 2,
  write: 8,
  test_run: 3,
  test_pass: 12,
  test_fail: 4,
  terminal: 4,
  idle: 0,
  error: 1,
  complete: 25,
  deploy: 20
};

/**
 * Mood changes per normalized action type.
 */
export const MOOD_DELTA_PER_ACTION: Readonly<Record<AgentAction, number>> = {
  read: 1,
  write: 2,
  test_run: 0,
  test_pass: 6,
  test_fail: -8,
  terminal: 0,
  idle: -1,
  error: -12,
  complete: 10,
  deploy: 8
};

/**
 * XP thresholds required for level-up progression.
 */
export const LEVEL_THRESHOLDS = [0, 50, 120, 220, 360, 540, 760, 1020] as const;

/**
 * Baseline persisted state for newly discovered creatures.
 */
export const DEFAULT_PERSISTED_CREATURE_STATE: PersistedCreatureState = {
  xp: 0,
  level: 1,
  mood: 0,
  lastState: 'idle',
  updatedAt: 0
};

/**
 * Default runtime config when settings are incomplete.
 */
export const DEFAULT_TERRARIUM_CONFIG: TerrariumConfig = {
  maxFps: MAX_FPS,
  agents: [],
  weatherEnabled: true
};

/**
 * Clamps a runtime FPS value to supported terrarium boundaries.
 *
 * @param value Candidate frame rate.
 * @returns Sanitized frame rate.
 */
export function clampMaxFps(value: number): number {
  if (!Number.isFinite(value)) {
    return MAX_FPS;
  }

  return Math.max(MIN_FPS, Math.min(MAX_FPS, Math.round(value)));
}

/**
 * Boundaries for clamping mood values.
 */
export const MOOD_BOUNDS = {
  min: -100,
  max: 100
} as const;

/**
 * Persisted state schema version.
 */
export const PERSISTED_SCHEMA_VERSION = 1 as const;

/**
 * Debounce duration for writing state snapshots to disk.
 */
export const PERSIST_DEBOUNCE_MS = 350;
