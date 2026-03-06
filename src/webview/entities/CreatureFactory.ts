import { TERRARIUM_DIMENSIONS } from '@shared/constants';
import type { AgentConfig, PersistedCreatureState } from '@shared/types';
import { Creature } from './Creature';

/**
 * Factory options for creating creature entities.
 */
export interface CreateCreatureOptions {
  /** Agent represented by this creature. */
  agent: AgentConfig;
  /** Index of agent among total active agents. */
  index: number;
  /** Total number of active agents. */
  total: number;
  /** Persisted state to hydrate into creature entity. */
  persisted: PersistedCreatureState;
}

/**
 * Spawns creatures with deterministic positions and texture selection.
 */
export class CreatureFactory {
  /**
   * Creates one creature instance for a configured agent.
   *
   * @param scene Scene that owns the entity.
   * @param options Spawn options.
   * @returns Spawned creature instance.
   */
  create(scene: Phaser.Scene, options: CreateCreatureOptions): Creature {
    const spawn = this.computeSpawn(options.agent.id, options.index, options.total);
    const textureKey = `creature-${options.agent.creatureType}`;

    return new Creature(scene, options.agent, spawn.x, spawn.y, textureKey, options.persisted);
  }

  /**
   * Computes deterministic spawn coordinates.
   *
   * @param agentId Agent id used for deterministic distribution.
   * @param index Index among active agents.
   * @param total Total active agents.
   * @returns Spawn position.
   */
  computeSpawn(agentId: string, index: number, total: number): { x: number; y: number } {
    const hash = hashString(agentId);
    const segmentWidth = TERRARIUM_DIMENSIONS.width / Math.max(total, 1);
    const baseX = segmentWidth * index + segmentWidth / 2;
    const xJitter = (hash % 41) - 20;
    const yBase = TERRARIUM_DIMENSIONS.height * 0.72;
    const yJitter = (hash % 27) - 13;

    return {
      x: clamp(baseX + xJitter, 48, TERRARIUM_DIMENSIONS.width - 48),
      y: clamp(yBase + yJitter, 220, TERRARIUM_DIMENSIONS.height - 52)
    };
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
