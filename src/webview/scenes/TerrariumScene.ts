import { TERRARIUM_DIMENSIONS } from '@shared/constants';
import type { AgentConfig } from '@shared/types';
import { Creature } from '../entities/Creature';
import { CreatureFactory } from '../entities/CreatureFactory';
import { DayNight } from '../environment/DayNight';
import { Flora } from '../environment/Flora';
import { Weather } from '../environment/Weather';
import { HUD } from '../ui/HUD';
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

    this.syncCreatures(state.getConfig().agents);
    this.hud.syncCreatures(this.creatures);

    this.unsubscribe = state.subscribe(() => {
      this.syncCreatures(state.getConfig().agents);
      this.hud.syncCreatures(this.creatures);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubscribe !== null) {
        this.unsubscribe();
      }
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
    }
  }

  private drawBackground(): void {
    const columns = Math.ceil(TERRARIUM_DIMENSIONS.width / TERRARIUM_DIMENSIONS.tileSize);
    const rows = Math.ceil(TERRARIUM_DIMENSIONS.height / TERRARIUM_DIMENSIONS.tileSize);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const textureKey = pickTileTexture(row, col);
        const image = this.add.image(
          col * TERRARIUM_DIMENSIONS.tileSize + TERRARIUM_DIMENSIONS.tileSize / 2,
          row * TERRARIUM_DIMENSIONS.tileSize + TERRARIUM_DIMENSIONS.tileSize / 2,
          textureKey
        );
        image.setDepth(0);
      }
    }
  }
}

function pickTileTexture(row: number, col: number): string {
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

function demoAgent(): AgentConfig {
  return {
    id: 'demo-agent',
    name: 'Demo Agent',
    transcriptPath: '',
    creatureType: 'slime'
  };
}
