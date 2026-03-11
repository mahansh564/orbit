import type { AgentEvent, PendingInputRequest } from '@shared/types';

/**
 * Tracks unresolved input requests for the Action Center panel.
 */
export class ActionCenterTracker {
  private readonly pendingByAgentId = new Map<string, PendingInputRequest>();

  /**
   * Applies an agent event to unresolved input-request state.
   *
   * `input_request` events upsert unresolved entries. Most later non-input
   * events resolve and remove the pending entry. Cursor runtime terminal pulse
   * events are ignored so they do not clear unresolved user-input requests.
   *
   * @param event Incoming normalized event.
   * @returns True when tracker state changed.
   */
  applyEvent(event: AgentEvent): boolean {
    if (event.kind === 'input_request') {
      const existing = this.pendingByAgentId.get(event.agentId);
      const next: PendingInputRequest = {
        agentId: event.agentId,
        ...(event.agentName !== undefined ? { agentName: event.agentName } : {}),
        prompt: event.prompt ?? 'Agent requested user input.',
        requestedAt: existing?.requestedAt ?? event.ts,
        updatedAt: event.ts
      };
      const changed =
        existing?.prompt !== next.prompt ||
        existing?.updatedAt !== next.updatedAt ||
        existing?.agentName !== next.agentName;
      this.pendingByAgentId.set(event.agentId, next);
      return changed || existing === undefined;
    }

    const metadataSource = event.metadata?.source;
    if (event.kind === 'terminal' && metadataSource === 'cursor_composer_storage') {
      return false;
    }

    return this.pendingByAgentId.delete(event.agentId);
  }

  /**
   * Returns pending entries ordered by freshness.
   *
   * @returns Pending unresolved input requests.
   */
  snapshot(): PendingInputRequest[] {
    return [...this.pendingByAgentId.values()].sort((left, right) => right.updatedAt - left.updatedAt);
  }

  /**
   * Clears all tracked pending requests.
   */
  reset(): void {
    this.pendingByAgentId.clear();
  }
}
