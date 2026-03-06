import type { AgentConfig, AgentEvent } from '@shared/types';

/**
 * Lifecycle handle created by an agent source adapter for one configured agent.
 */
export interface AgentSourceAdapterInstance {
  /**
   * Applies updated agent configuration to the active source instance.
   *
   * @param agent Latest agent configuration.
   */
  updateAgent(agent: AgentConfig): void;

  /**
   * Releases adapter resources and stops event emission.
   */
  dispose(): void;
}

/**
 * Options passed to adapter instances.
 */
export interface AgentSourceAdapterOptions {
  /** Agent configuration that owns this source. */
  agent: AgentConfig;
  /** Callback used to publish normalized events. */
  onEvent: (event: AgentEvent) => void;
  /** Optional callback for non-fatal adapter failures. */
  onError?: (error: Error) => void;
}

/**
 * Source adapter contract for producing AgentEvents from configurable inputs.
 */
export interface AgentSourceAdapter {
  /** Unique adapter identifier used in configuration. */
  id: string;

  /**
   * Creates a lifecycle instance for one agent source.
   *
   * @param options Adapter runtime options.
   * @returns Active instance that can be updated/disposed.
   */
  createInstance(options: AgentSourceAdapterOptions): AgentSourceAdapterInstance;
}
