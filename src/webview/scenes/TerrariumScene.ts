import { TERRARIUM_DIMENSIONS } from '@shared/constants';
import type { AgentConfig } from '@shared/types';
import { TERRARIUM_AUDIO_ASSETS, TERRARIUM_TILEMAP_KEY } from '../assets/manifest';
import { Creature } from '../entities/Creature';
import { CreatureFactory } from '../entities/CreatureFactory';
import { DayNight } from '../environment/DayNight';
import { Flora } from '../environment/Flora';
import {
  pickTileTextureFallback,
  readTilemapAsset,
  resolveTileFromMap
} from '../environment/tilemap';
import { Weather } from '../environment/Weather';
import { HUD } from '../ui/HUD';
import { Tooltip } from '../ui/Tooltip';
import { getTerrariumState } from '../state/context';

/**
 * Main gameplay scene rendering creatures and ecosystem systems.
 */
export class TerrariumScene extends Phaser.Scene {
  private readonly creatures = new Map<string, Creature>();
  private readonly creatureFactory = new CreatureFactory();
  private weather!: Weather;
  private flora!: Flora;
  private dayNight!: DayNight;
  private hud!: HUD;
  private tooltip!: Tooltip;
  private ambientTrack: Phaser.Sound.BaseSound | null = null;
  private unsubscribe: (() => void) | null = null;

  /**
   * Creates the terrarium scene.
   */
  constructor() {
    super('TerrariumScene');
  }

  /**
   * Initializes visual layers and subscribes to state changes.
   */
  create(): void {
    const state = getTerrariumState();

    this.drawBackground();

    this.weather = new Weather(this);
    this.flora = new Flora(this);
    this.dayNight = new DayNight(this);
    this.hud = new HUD(this);
    this.tooltip = new Tooltip(this);
    this.weather.setEnabled(state.getConfig().weatherEnabled);
    this.startAmbientTrack();

    this.syncCreatures(state.getConfig().agents);
    this.hud.syncCreatures(this.creatures);
    this.tooltip.syncCreatures(this.creatures);

    this.unsubscribe = state.subscribe(() => {
      this.weather.setEnabled(state.getConfig().weatherEnabled);
      this.syncCreatures(state.getConfig().agents);
      this.hud.syncCreatures(this.creatures);
      this.tooltip.syncCreatures(this.creatures);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubscribe !== null) {
        this.unsubscribe();
      }

      if (this.ambientTrack !== null) {
        this.ambientTrack.stop();
        this.ambientTrack.destroy();
        this.ambientTrack = null;
      }

      this.tooltip.destroy();
    });
  }

  /**
   * Updates creatures and ecosystem systems on each frame.
   *
   * @param time Current timestamp.
   * @param delta Delta frame time.
   */
  update(time: number, delta: number): void {
    const state = getTerrariumState();

    const events = state.drainAgentEvents();
    for (const event of events) {
      const creature = this.creatures.get(event.agentId);
      if (creature === undefined) {
        continue;
      }

      if (creature.applyEvent(event)) {
        state.updateCreatureState(event.agentId, creature.toPersistedState());
      }
    }

    const signals = state.drainHealthSignals();
    for (const signal of signals) {
      this.weather.applySignal(signal);
      this.flora.applySignal(signal);
    }

    for (const [agentId, creature] of this.creatures) {
      if (creature.tick(time)) {
        state.updateCreatureState(agentId, creature.toPersistedState());
      }
    }

    this.weather.update(time);
    this.flora.update(delta);
    this.dayNight.update(time);
    this.hud.update(this.creatures);
    this.tooltip.update(this.creatures);
  }

  private syncCreatures(configuredAgents: AgentConfig[]): void {
    const agents = configuredAgents.length > 0 ? configuredAgents : [demoAgent()];
    const incomingIds = new Set(agents.map((agent) => agent.id));

    for (const [agentId, creature] of this.creatures) {
      if (incomingIds.has(agentId)) {
        continue;
      }

      creature.destroy();
      this.creatures.delete(agentId);
    }

    for (let index = 0; index < agents.length; index += 1) {
      const agent = agents[index];
      if (agent === undefined) {
        continue;
      }

      if (this.creatures.has(agent.id)) {
        continue;
      }

      const creature = this.creatureFactory.create(this, {
        agent,
        index,
        total: agents.length,
        persisted: getTerrariumState().getCreatureState(agent.id)
      });

      this.creatures.set(agent.id, creature);
      this.bindCreatureTooltipInteractions(creature);
    }
  }

  private bindCreatureTooltipInteractions(creature: Creature): void {
    const agentId = creature.getAgent().id;

    creature.onPointerOver(() => {
      this.tooltip.setHoveredAgent(agentId);
    });

    creature.onPointerOut(() => {
      this.tooltip.clearHoveredAgent(agentId);
    });

    creature.onPointerDown(() => {
      this.tooltip.toggleSelectedAgent(agentId);
      this.tooltip.setHoveredAgent(agentId);
    });
  }

  private drawBackground(): void {
    const loadedTilemap = readTilemapAsset(this.cache.json.get(TERRARIUM_TILEMAP_KEY));
    const tileSize = loadedTilemap?.tileSize ?? TERRARIUM_DIMENSIONS.tileSize;
    const columns = loadedTilemap?.width ?? Math.ceil(TERRARIUM_DIMENSIONS.width / tileSize);
    const rows = loadedTilemap?.height ?? Math.ceil(TERRARIUM_DIMENSIONS.height / tileSize);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const textureKey =
          loadedTilemap !== null
            ? resolveTileFromMap(loadedTilemap, row, col)
            : pickTileTextureFallback(row, col);
        const image = this.add.image(
          col * tileSize + tileSize / 2,
          row * tileSize + tileSize / 2,
          textureKey
        );
        image.setDepth(0);
      }
    }
  }

  private startAmbientTrack(): void {
    const track = TERRARIUM_AUDIO_ASSETS[0];
    if (track === undefined) {
      return;
    }

    try {
      this.ambientTrack = this.sound.add(track.key, {
        loop: true,
        volume: 0.08
      });
    } catch {
      this.ambientTrack = null;
      return;
    }

    const playTrack = (): void => {
      if (this.ambientTrack !== null && !this.ambientTrack.isPlaying) {
        this.ambientTrack.play();
      }
    };

    if (this.sound.locked) {
      this.sound.once('unlocked', playTrack);
      return;
    }

    playTrack();
  }
}

function demoAgent(): AgentConfig {
  return {
    id: 'demo-agent',
    name: 'Demo Agent',
    transcriptPath: '',
    creatureType: 'slime'
  };
}
