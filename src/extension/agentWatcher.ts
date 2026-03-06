import type { AgentConfig, AgentEvent } from '@shared/types';
import { AgentSourceAdapterRegistry } from './adapters/registry';
import type { AgentSourceAdapter, AgentSourceAdapterInstance } from './adapters/types';

/**
 * Callback signature invoked whenever a normalized transcript event is produced.
 */
export type AgentEventHandler = (event: AgentEvent) => void;

/**
 * Optional callback signature for non-fatal watcher errors.
 */
export type AgentWatcherErrorHandler = (error: Error) => void;

/**
 * Optional construction settings for watcher manager.
 */
export interface AgentWatcherManagerOptions {
  /** Additional source adapters to register. */
  adapters?: AgentSourceAdapter[];
}

interface AgentWatchContext {
  agent: AgentConfig;
  adapterId: string;
  instance: AgentSourceAdapterInstance;
}

/**
 * Watches configured agent transcript sources via pluggable source adapters.
 */
export class AgentWatcherManager {
  private readonly contexts = new Map<string, AgentWatchContext>();
  private readonly adapterRegistry: AgentSourceAdapterRegistry;

  /**
   * Creates a watcher manager.
   *
   * @param onEvent Event callback for parsed agent events.
   * @param onError Optional callback for non-fatal watcher failures.
   * @param options Optional adapter registration overrides.
   */
  constructor(
    private readonly onEvent: AgentEventHandler,
    private readonly onError?: AgentWatcherErrorHandler,
    options: AgentWatcherManagerOptions = {}
  ) {
    this.adapterRegistry = new AgentSourceAdapterRegistry(options.adapters);
  }

  /**
   * Updates active watchers to match the provided agent list.
   *
   * @param agents Current configured agents.
   */
  updateAgents(agents: AgentConfig[]): void {
    const incomingIds = new Set(agents.map((agent) => agent.id));

    for (const [existingId] of this.contexts) {
      if (!incomingIds.has(existingId)) {
        this.disposeContext(existingId);
      }
    }

    for (const agent of agents) {
      const resolved = this.adapterRegistry.resolve(agent, this.onError);
      const existingContext = this.contexts.get(agent.id);

      if (
        existingContext !== undefined &&
        existingContext.adapterId === resolved.adapterId &&
        existingContext.agent.transcriptPath === agent.transcriptPath
      ) {
        existingContext.agent = agent;
        existingContext.instance.updateAgent(agent);
        continue;
      }

      this.disposeContext(agent.id);
      this.createContext(agent, resolved.adapterId, resolved.adapter);
    }
  }

  /**
   * Disposes all active source watchers.
   */
  dispose(): void {
    for (const [agentId] of this.contexts) {
      this.disposeContext(agentId);
    }
  }

  private createContext(agent: AgentConfig, adapterId: string, adapter: AgentSourceAdapter): void {
    try {
      const instance = adapter.createInstance({
        agent,
        onEvent: this.onEvent,
        ...(this.onError !== undefined ? { onError: this.onError } : {})
      });

      this.contexts.set(agent.id, {
        agent,
        adapterId,
        instance
      });
    } catch (error) {
      this.reportError(error);
    }
  }

  private disposeContext(agentId: string): void {
    const context = this.contexts.get(agentId);
    if (context === undefined) {
      return;
    }

    context.instance.dispose();
    this.contexts.delete(agentId);
  }

  private reportError(error: unknown): void {
    if (this.onError === undefined) {
      return;
    }

    if (error instanceof Error) {
      this.onError(error);
      return;
    }

    this.onError(new Error(String(error)));
  }
}
