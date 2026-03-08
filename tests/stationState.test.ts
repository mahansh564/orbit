import { describe, expect, it } from 'vitest';
import { StationState } from '../src/webview/state/StationState';
import type { WebviewToExtensionMessage } from '../src/shared/types';

function createStateHarness(): {
  state: StationState;
  postedMessages: WebviewToExtensionMessage[];
} {
  const postedMessages: WebviewToExtensionMessage[] = [];
  return {
    postedMessages,
    state: new StationState((message) => {
      postedMessages.push(message);
    })
  };
}

describe('StationState', () => {
  it('requests add-agent flow through extension bridge message', () => {
    const { state, postedMessages } = createStateHarness();

    state.requestAddAgent();

    expect(postedMessages).toEqual([{ type: 'open_add_agent' }]);
  });

  it('keeps agent list in sync when the same agent id is re-added', () => {
    const { state } = createStateHarness();

    state.handleMessage({
      type: 'init',
      payload: {
        config: {
          maxFps: 24,
          stationEffectsEnabled: true,
          agents: [
            {
              id: 'codex',
              name: 'Codex',
              transcriptPath: '/tmp/codex.jsonl',
              crewRole: 'engineer'
            }
          ]
        },
        persisted: {
          version: 2,
          crew: {}
        }
      }
    });

    state.handleMessage({
      type: 'agent_added',
      payload: {
        id: 'codex',
        name: 'Codex v2',
        transcriptPath: '/tmp/codex-v2.jsonl',
        crewRole: 'pilot'
      }
    });

    const config = state.getConfig();
    expect(config.agents).toHaveLength(1);
    expect(config.agents[0]).toEqual({
      id: 'codex',
      name: 'Codex v2',
      transcriptPath: '/tmp/codex-v2.jsonl',
      crewRole: 'pilot'
    });
  });
});
