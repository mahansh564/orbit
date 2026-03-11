import { describe, expect, it } from 'vitest';
import { ActionCenterTracker } from '../src/extension/actionCenter';

describe('ActionCenterTracker', () => {
  it('tracks unresolved input requests and clears on next non-input event', () => {
    const tracker = new ActionCenterTracker();
    tracker.applyEvent({
      kind: 'input_request',
      agentId: 'codex',
      agentName: 'Codex',
      prompt: 'Need approval for deploy target.',
      ts: 100
    });

    expect(tracker.snapshot()).toEqual([
      {
        agentId: 'codex',
        agentName: 'Codex',
        prompt: 'Need approval for deploy target.',
        requestedAt: 100,
        updatedAt: 100
      }
    ]);

    tracker.applyEvent({
      kind: 'write',
      agentId: 'codex',
      ts: 200
    });
    expect(tracker.snapshot()).toEqual([]);
  });

  it('keeps original requestedAt and updates prompt on repeated input events', () => {
    const tracker = new ActionCenterTracker();
    tracker.applyEvent({
      kind: 'input_request',
      agentId: 'codex',
      prompt: 'first',
      ts: 100
    });
    tracker.applyEvent({
      kind: 'input_request',
      agentId: 'codex',
      prompt: 'second',
      ts: 140
    });

    expect(tracker.snapshot()).toEqual([
      {
        agentId: 'codex',
        prompt: 'second',
        requestedAt: 100,
        updatedAt: 140
      }
    ]);
  });

  it('does not clear unresolved input request on cursor runtime terminal pulse', () => {
    const tracker = new ActionCenterTracker();
    tracker.applyEvent({
      kind: 'input_request',
      agentId: 'cursor-agent',
      prompt: 'Need your input.',
      ts: 100
    });

    tracker.applyEvent({
      kind: 'terminal',
      agentId: 'cursor-agent',
      command: 'cursor-runtime-running-pulse',
      metadata: {
        source: 'cursor_composer_storage'
      },
      ts: 120
    });

    expect(tracker.snapshot()).toEqual([
      {
        agentId: 'cursor-agent',
        prompt: 'Need your input.',
        requestedAt: 100,
        updatedAt: 100
      }
    ]);
  });
});
