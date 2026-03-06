import {
  DEFAULT_TERRARIUM_CONFIG,
  DEFAULT_PERSISTED_CREATURE_STATE,
  PERSIST_DEBOUNCE_MS,
  PERSISTED_SCHEMA_VERSION
} from '@shared/constants';
import type {
  AgentConfig,
  AgentEvent,
  ExtensionToWebviewMessage,
  HealthSignal,
  PersistedCreatureState,
  PersistedStatsFile,
  TerrariumConfig,
  WebviewToExtensionMessage
} from '@shared/types';

/**
 * Callback that posts a typed message from webview to extension host.
 */
export type PostToExtension = (message: WebviewToExtensionMessage) => void;

/**
 * Listener callback for state changes.
 */
export type TerrariumStateListener = () => void;

/**
 * Central in-memory state store for the webview runtime.
 */
export class TerrariumState {
  private config: TerrariumConfig = { ...DEFAULT_TERRARIUM_CONFIG };

  private persisted: PersistedStatsFile = {
    version: PERSISTED_SCHEMA_VERSION,
    creatures: {}
  };

  private readonly eventQueue: AgentEvent[] = [];
  private readonly healthQueue: HealthSignal[] = [];
  private readonly listeners = new Set<TerrariumStateListener>();
  private persistDebounceHandle: number | null = null;

  /**
   * Creates the state store.
   *
   * @param postToExtension Message transport callback.
   */
  constructor(private readonly postToExtension: PostToExtension) {}

  /**
   * Subscribes to store updates.
   *
   * @param listener State-change listener.
   * @returns Unsubscribe function.
   */
  subscribe(listener: TerrariumStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Applies incoming extension-host message to store state.
   *
   * @param message Incoming extension-to-webview message.
   */
  handleMessage(message: ExtensionToWebviewMessage): void {
    switch (message.type) {
      case 'init':
        this.config = message.payload.config;
        this.persisted = sanitizePersisted(message.payload.persisted);
        this.ensureAgentStates(this.config.agents);
        this.emit();
        break;
      case 'agent_added': {
        const withoutOld = this.config.agents.filter((agent) => agent.id !== message.payload.id);
        this.config = {
          ...this.config,
          agents: [...withoutOld, message.payload]
        };
        this.ensureAgentStates(this.config.agents);
        this.emit();
        break;
      }
      case 'agent_event':
        this.eventQueue.push(message.payload);
        this.ensureStateForAgent(message.payload.agentId);
        break;
      case 'health_signal':
        this.healthQueue.push(message.payload);
        break;
      case 'state_sync':
        this.persisted = sanitizePersisted(message.payload);
        this.emit();
        break;
      case 'reset':
        this.persisted = {
          version: PERSISTED_SCHEMA_VERSION,
          creatures: {}
        };
        this.eventQueue.length = 0;
        this.healthQueue.length = 0;
        this.ensureAgentStates(this.config.agents);
        this.emit();
        break;
      default:
        break;
    }
  }

  /**
   * Returns current terrarium config snapshot.
   *
   * @returns Current config object.
   */
  getConfig(): TerrariumConfig {
    return this.config;
  }

  /**
   * Returns persisted creature state by agent id.
   *
   * @param agentId Agent identifier.
   * @returns Persisted stats for this agent.
   */
  getCreatureState(agentId: string): PersistedCreatureState {
    return this.persisted.creatures[agentId] ?? {
      ...DEFAULT_PERSISTED_CREATURE_STATE,
      updatedAt: Date.now()
    };
  }

  /**
   * Returns all persisted creature states.
   *
   * @returns Clone of persisted state map.
   */
  getPersistedSnapshot(): PersistedStatsFile {
    return {
      version: PERSISTED_SCHEMA_VERSION,
      creatures: { ...this.persisted.creatures }
    };
  }

  /**
   * Drains currently queued agent events.
   *
   * @returns Events accumulated since last drain.
   */
  drainAgentEvents(): AgentEvent[] {
    const events = this.eventQueue.splice(0, this.eventQueue.length);
    return events;
  }

  /**
   * Drains currently queued health signals.
   *
   * @returns Health signals accumulated since last drain.
   */
  drainHealthSignals(): HealthSignal[] {
    const signals = this.healthQueue.splice(0, this.healthQueue.length);
    return signals;
  }

  /**
   * Stores latest creature stats and debounces persistence message.
   *
   * @param agentId Agent identifier.
   * @param nextState Latest creature state snapshot.
   */
  updateCreatureState(agentId: string, nextState: PersistedCreatureState): void {
    this.persisted.creatures[agentId] = nextState;
    this.schedulePersist();
  }

  private ensureAgentStates(agents: AgentConfig[]): void {
    for (const agent of agents) {
      this.ensureStateForAgent(agent.id);
    }
  }

  private ensureStateForAgent(agentId: string): void {
    if (this.persisted.creatures[agentId] !== undefined) {
      return;
    }

    this.persisted.creatures[agentId] = {
      ...DEFAULT_PERSISTED_CREATURE_STATE,
      updatedAt: Date.now()
    };
  }

  private schedulePersist(): void {
    if (this.persistDebounceHandle !== null) {
      window.clearTimeout(this.persistDebounceHandle);
    }

    this.persistDebounceHandle = window.setTimeout(() => {
      this.persistDebounceHandle = null;
      this.postToExtension({
        type: 'persist_state',
        payload: this.getPersistedSnapshot()
      });
    }, PERSIST_DEBOUNCE_MS);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function sanitizePersisted(value: PersistedStatsFile): PersistedStatsFile {
  return {
    version: PERSISTED_SCHEMA_VERSION,
    creatures: { ...value.creatures }
  };
}
